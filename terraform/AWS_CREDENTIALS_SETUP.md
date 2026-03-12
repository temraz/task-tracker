# AWS Credentials Setup for Terraform Deployment

## What I Need to Deploy

To deploy your Task Manager to AWS using Terraform, I need access to your AWS account. Here are the options:

## Option 1: AWS Access Keys (Recommended for Automation)

### Required Information:
1. **AWS Access Key ID**
2. **AWS Secret Access Key**
3. **AWS Region** (e.g., us-east-1, us-west-2, eu-west-1)

### How to Create Access Keys:

1. **Login to AWS Console**: https://console.aws.amazon.com
2. **Go to IAM**: Click on your username → "Security credentials"
3. **Create Access Key**:
   - Scroll to "Access keys" section
   - Click "Create access key"
   - Choose "Command Line Interface (CLI)"
   - Click "Next"
   - Add description (optional): "Terraform deployment"
   - Click "Create access key"
   - **IMPORTANT**: Download or copy both:
     - Access Key ID
     - Secret Access Key (shown only once!)

### Provide to Me:
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

⚠️ **Security Note**: These credentials give full access to your AWS account. Only share if you trust me, or create a limited IAM user (see Option 2).

## Option 2: Limited IAM User (More Secure)

Create an IAM user with only the permissions needed for deployment:

### Required Permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "iam:GetInstanceProfile",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### Steps:
1. Go to IAM → Users → Add users
2. Username: `terraform-deploy`
3. Select "Programmatic access"
4. Attach policy: Create custom policy with above permissions
5. Create user and save credentials

## Option 3: AWS CLI Profile (You Run Commands)

If you prefer to run Terraform yourself:

1. **Install AWS CLI**: https://aws.amazon.com/cli/
2. **Configure**:
   ```bash
   aws configure
   ```
3. **Run Terraform**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

## Option 4: Temporary Credentials (Most Secure)

Use AWS SSO or temporary credentials from your organization.

## What I'll Do With Credentials

1. **Initialize Terraform** with your AWS credentials
2. **Create EC2 instance** (t2.micro, free tier)
3. **Set up security groups** (ports 22, 80, 443, 3000, 5432)
4. **Configure networking** (default VPC)
5. **Deploy application** (via user-data script)
6. **Output connection details** (IP, SSH command, URLs)

## Security Best Practices

1. ✅ **Use IAM user** with limited permissions (not root account)
2. ✅ **Rotate credentials** after deployment
3. ✅ **Delete access keys** when not needed
4. ✅ **Use MFA** on your AWS account
5. ✅ **Review CloudTrail** logs regularly
6. ✅ **Set up billing alerts** to monitor costs

## After Deployment

Once deployed, you should:
1. **Delete or rotate** the access keys
2. **Restrict security groups** to your IP only
3. **Set up CloudWatch** billing alerts
4. **Enable MFA** on your AWS account

## Cost Monitoring

Set up billing alerts:
1. Go to AWS Billing → Preferences
2. Enable "Receive Billing Alerts"
3. Create CloudWatch alarm for estimated charges
4. Set threshold: $1 (to get notified early)

## Questions?

If you have any questions about:
- What permissions are needed
- How credentials are used
- Security concerns
- Alternative deployment methods

Feel free to ask!
