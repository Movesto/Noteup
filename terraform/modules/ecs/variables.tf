variable "project" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_sg_id" {
  type = string
}

variable "backend_sg_id" {
  type = string
}

variable "frontend_sg_id" {
  type = string
}

variable "backend_image" {
  type = string
}

variable "frontend_image" {
  type = string
}

variable "db_url" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "unsplash_access_key" {
  type      = string
  sensitive = true
}

variable "session_secret" {
  type      = string
  sensitive = true
}
