output "public_ip" {
  description = "Public IP of the monitoring EC2 instance"
  value       = aws_instance.monitoring.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.monitoring.id
}
