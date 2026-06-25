output "app_url" {
  description = "Public URL of the application"
  value       = "http://${module.ecs.alb_dns_name}"
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "http://${module.observability.public_ip}:3000"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://${module.observability.public_ip}:9090"
}

output "db_endpoint" {
  description = "RDS endpoint"
  value       = module.database.endpoint
}

output "ecr_backend_url" {
  description = "ECR repository URL for the backend image"
  value       = module.ecs.ecr_backend_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for the frontend image"
  value       = module.ecs.ecr_frontend_url
}
