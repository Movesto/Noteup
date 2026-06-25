output "endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "connection_url" {
  description = "Full async SQLAlchemy connection URL"
  value       = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}

output "ssm_parameter_name" {
  description = "SSM parameter name storing the connection URL"
  value       = aws_ssm_parameter.db_url.name
}
