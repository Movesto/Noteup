output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "alb_sg_id" {
  value = aws_security_group.alb.id
}

output "frontend_sg_id" {
  value = aws_security_group.frontend.id
}

output "backend_sg_id" {
  value = aws_security_group.backend.id
}

output "rds_sg_id" {
  value = aws_security_group.rds.id
}

output "monitoring_sg_id" {
  value = aws_security_group.monitoring.id
}
