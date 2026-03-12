variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1" # Change to your preferred region
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro" # Free tier eligible
}

variable "key_pair_name" {
  description = "Name of the AWS Key Pair for SSH access"
  type        = string
  default     = "" # You need to provide this
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
  default     = "" # You need to provide this
}

variable "session_secret" {
  description = "Session secret for Express sessions"
  type        = string
  sensitive   = true
  default     = "" # Will be generated if not provided
}

variable "allocate_elastic_ip" {
  description = "Allocate an Elastic IP for static IP address"
  type        = bool
  default     = false # Elastic IPs cost money if not attached to running instance
}

variable "microsoft_client_id" {
  description = "Microsoft Azure AD Client ID (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "microsoft_client_secret" {
  description = "Microsoft Azure AD Client Secret (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "microsoft_tenant_id" {
  description = "Microsoft Azure AD Tenant ID (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "email_host" {
  description = "SMTP email host (optional)"
  type        = string
  default     = ""
}

variable "email_user" {
  description = "SMTP email user (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "email_password" {
  description = "SMTP email password (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "frontend_url" {
  description = "Frontend URL for CORS and redirects"
  type        = string
  default     = ""
}
