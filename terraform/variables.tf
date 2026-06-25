variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name — used as a prefix for all resource names"
  type        = string
  default     = "amor"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to deploy into"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

# Database
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "amor_db"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "amor"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

# ECS / App
variable "backend_image" {
  description = "Full ECR image URI for the backend (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/amor-backend:latest)"
  type        = string
}

variable "frontend_image" {
  description = "Full ECR image URI for the frontend"
  type        = string
}

variable "jwt_secret" {
  description = "Secret key used to sign JWT tokens"
  type        = string
  sensitive   = true
}

variable "unsplash_access_key" {
  description = "Unsplash API access key"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Secret used to sign Remix cookie sessions (min 32 chars)"
  type        = string
  sensitive   = true
}

# Observability
variable "monitoring_allowed_cidr" {
  description = "CIDR allowed to reach Grafana and Prometheus (restrict to your IP)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
  default     = "changeme"
}

variable "monitoring_instance_type" {
  description = "EC2 instance type for the monitoring server"
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH access to the monitoring instance"
  type        = string
  default     = ""
}
