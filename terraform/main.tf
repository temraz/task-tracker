
provider "aws" {
  region = var.aws_region
  
  # Credentials can be provided via:
  # 1. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
  # 2. AWS credentials file (~/.aws/credentials)
  # 3. IAM role (if running on EC2)
}

# Get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# VPC (use default VPC for simplicity)
data "aws_vpc" "default" {
  default = true
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Get subnet details to filter by availability zone
data "aws_subnet" "subnets" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

# Security Group for EC2 instance
resource "aws_security_group" "task_manager_sg" {
  name        = "task-manager-sg"
  description = "Security group for Task Manager application"
  vpc_id      = data.aws_vpc.default.id

  # SSH access (restrict to your IP in production)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Change this to your IP in production!
  }

  # HTTP access
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Application port (optional, if not using nginx)
  ingress {
    description = "Node.js App"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL (restrict to EC2 only in production)
  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "task-manager-sg"
  }
}

# EC2 Key Pair (you'll need to create this manually or use existing)
# Run: ssh-keygen -t rsa -b 4096 -f ~/.ssh/task-manager-key
# Then: aws ec2 import-key-pair --key-name task-manager-key --public-key-material fileb://~/.ssh/task-manager-key.pub
data "aws_key_pair" "existing" {
  count    = var.key_pair_name != "" ? 1 : 0
  key_name = var.key_pair_name
}

# EC2 Instance
resource "aws_instance" "task_manager" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  key_name      = var.key_pair_name != "" ? var.key_pair_name : null

  vpc_security_group_ids = [aws_security_group.task_manager_sg.id]
  
  # Use a subnet in an availability zone that supports t3.micro (exclude us-east-1e)
  # Filter to subnets in us-east-1a, 1b, 1c, 1d, or 1f
  subnet_id = try([
    for subnet_id in data.aws_subnets.default.ids : subnet_id
    if can(regex("us-east-1[a-df]", data.aws_subnet.subnets[subnet_id].availability_zone))
  ][0], data.aws_subnets.default.ids[0])

  # Root volume (30 GB for free tier)
  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  # User data script to install Docker and deploy app
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    db_password = var.db_password
    session_secret = var.session_secret
  }))

  # Enable detailed monitoring (optional, costs extra)
  monitoring = false

  tags = {
    Name        = "task-manager-app"
    Environment = "production"
    Project     = "task-manager"
  }

  # After the instance is ready, upload the application code and start the stack
  connection {
    type        = "ssh"
    host        = self.public_ip
    user        = "ec2-user"
    private_key = file(pathexpand(var.private_key_path))
  }

  # Ensure destination directory exists and is writable by ec2-user
  provisioner "remote-exec" {
    inline = [
      "set -e",
      "sudo mkdir -p /opt/task-manager",
      "sudo chown ec2-user:ec2-user /opt/task-manager",
      "echo 'Prepared /opt/task-manager directory'",
    ]
  }

  # Copy the current project (parent dir of terraform/) to the instance
  provisioner "file" {
    source      = abspath("${path.module}/..")
    destination = "/opt/task-manager"
  }

  # Build and start containers
  provisioner "remote-exec" {
    inline = [
      "set -e",
      "cd /opt/task-manager",
      # wait for docker and docker-compose (user data may still be installing)
      "until command -v docker >/dev/null 2>&1; do echo 'waiting for docker'; sleep 5; done",
      "sudo systemctl start docker || true",
      "sudo systemctl enable docker || true",
      "until [ -x /usr/local/bin/docker-compose ]; do echo 'waiting for docker-compose'; sleep 5; done",
      # Prefer production compose if present; fallback to default
      "if [ -f docker-compose.prod.yml ]; then /usr/local/bin/docker-compose -f docker-compose.prod.yml up -d --build; else /usr/local/bin/docker-compose up -d --build; fi",
      "echo 'Application started via docker-compose' | sudo tee -a /var/log/user-data.log"
    ]
  }
}

# Elastic IP (optional - for static IP)
resource "aws_eip" "task_manager" {
  count  = var.allocate_elastic_ip ? 1 : 0
  domain = "vpc"

  tags = {
    Name = "task-manager-eip"
  }
}

resource "aws_eip_association" "task_manager" {
  count         = var.allocate_elastic_ip ? 1 : 0
  instance_id   = aws_instance.task_manager.id
  allocation_id = aws_eip.task_manager[0].id
}

# Outputs
output "instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.task_manager.id
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.task_manager.public_ip
}

output "instance_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.task_manager.public_dns
}

output "elastic_ip" {
  description = "Elastic IP address (if allocated)"
  value       = var.allocate_elastic_ip ? aws_eip.task_manager[0].public_ip : null
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.key_pair_name != "" ? var.key_pair_name : "your-key.pem"} ec2-user@${aws_instance.task_manager.public_ip}"
}

output "application_url" {
  description = "Application URL"
  value       = "http://${aws_instance.task_manager.public_ip}:3000"
}

output "database_connection" {
  description = "Database connection details"
  value = {
    host     = aws_instance.task_manager.private_ip
    port     = 5432
    database = "classera_tasks"
    user     = "postgres"
    password = var.db_password
  }
  sensitive = true
}
