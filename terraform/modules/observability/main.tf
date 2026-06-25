data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "monitoring" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.monitoring_instance_type
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [var.monitoring_sg_id]
  associate_public_ip_address = true
  key_name                    = var.key_pair_name != "" ? var.key_pair_name : null

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/templates/monitoring-init.sh.tpl", {
    backend_target         = var.backend_alb_dns
    grafana_admin_password = var.grafana_admin_password
  }))

  tags = { Name = "${var.project}-monitoring" }
}
