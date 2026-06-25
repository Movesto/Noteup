resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = { Name = "${var.project}-db-subnet-group" }
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.project}-pg16"
  family = "postgres16"

  parameter {
    name  = "log_connections"
    value = "1"
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = { Name = "${var.project}-pg16" }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project}-postgres"

  engine               = "postgres"
  engine_version       = "16"
  instance_class       = var.db_instance_class
  allocated_storage    = 20
  max_allocated_storage = 100
  storage_type         = "gp3"
  storage_encrypted    = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-final-snapshot"

  performance_insights_enabled = true

  tags = { Name = "${var.project}-postgres" }
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/${var.project}/database_url"
  type  = "SecureString"
  value = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
  tags  = { Name = "${var.project}-db-url" }
}
