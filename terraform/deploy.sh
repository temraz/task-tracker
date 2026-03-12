#!/bin/bash
set -e

echo "🚀 Task Manager AWS Deployment Script"
echo "======================================"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

echo "✅ AWS credentials configured"

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "📝 Creating terraform.tfvars from example..."
    cp terraform.tfvars.example terraform.tfvars
    echo "⚠️  Please edit terraform.tfvars with your values before continuing!"
    echo "   Required: key_pair_name, db_password, session_secret"
    exit 1
fi

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Plan deployment
echo "📋 Planning deployment..."
terraform plan -out=tfplan

# Ask for confirmation
read -p "Do you want to proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Apply deployment
echo "🚀 Deploying infrastructure..."
terraform apply tfplan

# Get instance IP
INSTANCE_IP=$(terraform output -raw instance_public_ip)
echo ""
echo "✅ Deployment complete!"
echo "📦 Instance IP: $INSTANCE_IP"
echo ""
echo "Next steps:"
echo "1. SSH to instance: ssh -i ~/.ssh/your-key.pem ec2-user@$INSTANCE_IP"
echo "2. Copy your application files to /opt/task-manager"
echo "3. Run: cd /opt/task-manager && docker-compose up -d --build"
echo ""
echo "Application will be available at: http://$INSTANCE_IP:3000"
