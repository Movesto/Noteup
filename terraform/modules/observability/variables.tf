variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "monitoring_sg_id" {
  type = string
}

variable "backend_alb_dns" {
  description = "ALB DNS name used by Prometheus to scrape the backend /metrics"
  type        = string
}

variable "grafana_admin_password" {
  type      = string
  sensitive = true
}

variable "monitoring_instance_type" {
  type    = string
  default = "t3.small"
}

variable "key_pair_name" {
  type    = string
  default = ""
}
