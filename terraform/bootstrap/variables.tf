variable "aws_region" {
  description = "AWS region for the remote state resources"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Globally unique S3 bucket name for Terraform state"
  type        = string
  default     = "amor-terraform-state"
}

variable "lock_table_name" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
  default     = "amor-terraform-locks"
}
