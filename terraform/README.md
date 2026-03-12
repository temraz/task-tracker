# Terraform Deployment Guide for Task Manager on AWS

This guide will help you deploy the Task Manager application to AWS using Terraform.

## Prerequisites

1. **AWS Account** with free tier eligibility
2. **Terraform** installed (>= 1.0)
3. **AWS CLI** installed and configured
4. **SSH Key Pair** created in AWS

## Step 1: Install Terraform

### macOS:
```bash
brew install terraform
```

### Linux:
```bash
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### Windows:
Download from: https://www.terraform.io/downloads

## Step 2: Configure AWS Credentials

### Option A: AWS CLI (Recommended)
```bash
aws configure
```
Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Option C: AWS Credentials File
Create `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = your-access-key-id
aws_secret_access_key = your-secret-access-key
```

Create `~/.aws/config`:
```ini
[default]
region = us-east-1
```

## Step 3: Create SSH Key Pair

### Generate SSH Key:
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/task-manager-key
```

### Import to AWS:
```bash
aws ec2 import-key-pair \
  --key-name task-manager-key \
  --public-key-material fileb://~/.ssh/task-manager-key.pub \
  --region us-east-1
```

Or create via AWS Console:
1. Go to EC2 → Key Pairs
2. Click "Create key pair"
3. Name: `task-manager-key`
4. Type: RSA
5. Format: .pem
6. Download and save the private key

## Step 4: Configure Terraform Variables

1. Copy the example file:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

2. Edit `terraform.tfvars`:
```hcl
aws_region = "us-east-1"
instance_type = "t2.micro"
key_pair_name = "task-manager-key"
db_password = "YourStrongPassword123!"
session_secret = "generate-with-openssl-rand-base64-32"
allocate_elastic_ip = false
```

3. Generate session secret:
```bash
openssl rand -base64 32
```

## Step 5: Initialize Terraform

```bash
cd terraform
terraform init
```

## Step 6: Review Deployment Plan

```bash
terraform plan
```

This will show you what resources will be created.

## Step 7: Deploy

```bash
terraform apply
```

Type `yes` when prompted.

## Step 8: Deploy Application Code

After the EC2 instance is created, you need to copy your application files:

### Option A: Using Git (Recommended)
```bash
# SSH into the instance
ssh -i ~/.ssh/task-manager-key ec2-user@<instance-ip>

# On the instance:
cd /opt/task-manager
git clone https://github.com/your-username/task-manager.git .
docker-compose up -d --build
```

### Option B: Using SCP
```bash
# From your local machine
scp -i ~/.ssh/task-manager-key -r /path/to/task-manager/* ec2-user@<instance-ip>:/opt/task-manager/

# Then SSH and run:
ssh -i ~/.ssh/task-manager-key ec2-user@<instance-ip>
cd /opt/task-manager
docker-compose up -d --build
```

### Option C: Using AWS CodeDeploy (Advanced)
Set up CI/CD pipeline for automatic deployments.

## Step 9: Access Your Application

After deployment, access your application at:
- HTTP: `http://<instance-ip>:3000`
- Or set up a domain and HTTPS (see below)

## Step 10: Set Up Domain and HTTPS (Optional)

1. Point your domain to the EC2 instance IP
2. Install Certbot on the instance:
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Useful Commands

### View outputs:
```bash
terraform output
```

### SSH to instance:
```bash
terraform output -raw ssh_command
```

### Destroy infrastructure:
```bash
terraform destroy
```

### Update infrastructure:
```bash
terraform plan
terraform apply
```

## Monitoring

### View instance logs:
```bash
ssh -i ~/.ssh/task-manager-key ec2-user@<instance-ip>
docker logs classera_app
docker logs classera_db
```

### Check application status:
```bash
docker ps
docker-compose ps
```

## Cost Estimation

- **EC2 t2.micro**: $0 (free tier for 12 months)
- **EBS 30GB**: $0 (free tier for 12 months)
- **Data Transfer**: 15GB free/month
- **After free tier**: ~$12-15/month

## Troubleshooting

### Can't connect via SSH:
- Check security group allows port 22
- Verify key pair name matches
- Check instance is running

### Application not accessible:
- Check security group allows port 3000 (or 80/443)
- Verify Docker containers are running
- Check application logs

### Database connection issues:
- Verify DB_HOST=db in environment
- Check database container is healthy
- Review database logs

## Security Recommendations

1. **Change default SSH port** (optional)
2. **Restrict SSH access** to your IP in security group
3. **Use strong passwords** for database
4. **Enable HTTPS** with Let's Encrypt
5. **Set up CloudWatch** monitoring
6. **Regular backups** of database
7. **Update system** regularly: `sudo yum update -y`

## Next Steps

1. Set up automated backups
2. Configure CloudWatch alarms
3. Set up domain name
4. Enable HTTPS
5. Configure email notifications
6. Set up monitoring and alerts
