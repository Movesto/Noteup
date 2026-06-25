output "state_bucket_name" {
  description = "S3 bucket name — copy into terraform/backend.tf"
  value       = aws_s3_bucket.state.id
}

output "lock_table_name" {
  description = "DynamoDB table name — copy into terraform/backend.tf"
  value       = aws_dynamodb_table.locks.name
}
