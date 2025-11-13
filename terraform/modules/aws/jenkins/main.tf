locals {
  tags = merge(var.tags, {
    "Component" = "jenkins"
  })

  jenkins_port = 8080
}

resource "aws_security_group" "jenkins" {
  name        = "${var.project_name}-${var.environment}-jenkins"
  description = "Allow Jenkins UI and SSH"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow Jenkins UI"
    from_port   = local.jenkins_port
    to_port     = local.jenkins_port
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }

  ingress {
    description = "Allow SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-jenkins-sg"
  })
}

resource "aws_instance" "jenkins" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size = var.volume_size_gb
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    enable_codedeploy_agent = var.enable_codedeploy_agent
    aws_region              = var.aws_region
  })

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-jenkins"
  })
}

resource "aws_eip_association" "jenkins" {
  instance_id   = aws_instance.jenkins.id
  allocation_id = aws_eip.jenkins.id
}

resource "aws_eip" "jenkins" {
  vpc  = true
  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-jenkins-eip"
  })
}

output "public_ip" {
  value = aws_eip.jenkins.public_ip
}

output "jenkins_url" {
  value = "http://${aws_eip.jenkins.public_ip}:${local.jenkins_port}"
}

output "security_group_id" {
  value = aws_security_group.jenkins.id
}
