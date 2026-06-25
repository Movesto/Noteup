terraform {
  backend "s3" {
    bucket         = "amor-terraform-state"
    key            = "amor/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "amor-terraform-locks"
    encrypt        = true
  }
}
