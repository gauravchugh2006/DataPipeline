locals {
  tags = merge(var.tags, {
    "Component" = "data"
  })
}

resource "aws_s3_bucket" "artifact" {
  bucket = var.artifact_bucket_name

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-artifacts"
  })
}

resource "aws_s3_bucket_versioning" "artifact" {
  count  = var.enable_versioning ? 1 : 0
  bucket = aws_s3_bucket.artifact.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifact" {
  bucket = aws_s3_bucket.artifact.id

  rule {
    id     = "retain-artifacts"
    status = "Enabled"

    expiration {
      days = var.retention_days
    }
  }
}

resource "aws_security_group" "data_access" {
  name        = "${var.project_name}-${var.environment}-data"
  description = "Controls access to shared data services"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow internal traffic"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    description = "Allow all outbound"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, {
    Name = "${var.project_name}-${var.environment}-data-sg"
  })
}

output "bucket" {
  value = {
    id     = aws_s3_bucket.artifact.id
    arn    = aws_s3_bucket.artifact.arn
    domain = aws_s3_bucket.artifact.bucket_domain_name
  }
}

output "security_group_id" {
  value = aws_security_group.data_access.id
}
