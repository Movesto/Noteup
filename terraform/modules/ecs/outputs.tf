output "alb_dns_name" {
  description = "Public DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecr_backend_url" {
  description = "ECR repository URL for backend images"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend images"
  value       = aws_ecr_repository.frontend.repository_url
}

output "cloudmap_namespace" {
  description = "CloudMap private DNS namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}
