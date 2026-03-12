# Quick Start: Deploy to AWS with Terraform

## Prerequisites Checklist

- [ ] AWS Account (free tier eligible)
- [ ] Terraform installed (`terraform --version`)
- [ ] AWS CLI installed (`aws --version`)
- [ ] SSH key pair created in AWS

## Step-by-Step Deployment

### 1. Install Terraform

**macOS:**
```bash
brew install terraform
```

**Linux:**
```bash
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

**Verify:**
```bash
terraform version
```

### 2. Configure AWS Credentials

**Option A: AWS CLI (Recommended)**
```bash
aws configure
```
Enter:
- AWS Access Key ID: `YOUR_ACCESS_KEY`
- AWS Secret Access Key: `YOUR_SECRET_KEY`
- Default region: `us-east-1`
- Default output: `json`

**Option B: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### 3. Create SSH Key Pair

**Generate key:**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/task-manager-key -N ""
```

**Import to AWS:**
```bash
aws ec2 import-key-pair \
  --key-name task-manager-key \
  --public-key-material fileb://~/.ssh/task-manager-key.pub \
  --region us-east-1
```

**Or create via AWS Console:**
1. EC2 → Key Pairs → Create key pair
2. Name: `task-manager-key`
3. Type: RSA, Format: .pem
4. Download and save

### 4. Configure Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
aws_region = "us-east-1"
instance_type = "t2.micro"
key_pair_name = "task-manager-key"
db_password = "YourStrongPassword123!"
session_secret = "generate-with-openssl-rand-base64-32"
```

Generate session secret:
```bash
openssl rand -base64 32
```

### 5. Deploy

```bash
terraform init
terraform plan
terraform apply
```

Type `yes` when prompted.

### 6. Deploy Application Code

After EC2 is created, SSH and deploy:

```bash
# Get instance IP from output
terraform output instance_public_ip

# SSH to instance
ssh -i ~/.ssh/task-manager-key ec2-user@<instance-ip>

# On the instance, copy your project files
# Option 1: Using Git
cd /opt/task-manager
git clone https://github.com/your-username/task-manager.git .

# Option 2: Using SCP (from your local machine)
# scp -i ~/.ssh/task-manager-key -r /path/to/task-manager/* ec2-user@<instance-ip>:/opt/task-manager/

# Start application
cd /opt/task-manager
docker-compose up -d --build
```

### 7. Access Application

- Application: `http://<instance-ip>:3000`
- Check status: `docker-compose ps`
- View logs: `docker-compose logs -f`

## What I Need From You

To deploy this for you, I need:

1. **AWS Access Key ID**
2. **AWS Secret Access Key**  
3. **AWS Region** (e.g., us-east-1)
4. **SSH Key Pair Name** (or I can create one)
5. **Database Password** (or I can generate one)
6. **Session Secret** (or I can generate one)

**OR** you can run it yourself using the steps above!

## Security Notes

⚠️ **Important:**
- Change default passwords after first login
- Restrict SSH access to your IP in security group
- Set up HTTPS with Let's Encrypt
- Enable CloudWatch billing alerts
- Rotate credentials regularly

## Troubleshooting

**Can't connect via SSH:**
- Check security group allows port 22
- Verify key pair name matches
- Check instance is running

**Application not accessible:**
- Check security group allows port 3000
- Verify Docker containers are running
- Check application logs: `docker-compose logs`

**Terraform errors:**
- Verify AWS credentials: `aws sts get-caller-identity`
- Check region is correct
- Verify key pair exists in that region

## Next Steps

1. Set up domain name
2. Configure HTTPS (Let's Encrypt)
3. Set up automated backups
4. Configure monitoring (CloudWatch)
5. Set up CI/CD pipeline
