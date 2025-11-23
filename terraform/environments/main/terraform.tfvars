project_name   = "datapipeline"
environment    = "main"
cloud_provider = "aws"
aws_region     = "us-east-1"

aws_networking = {
  vpc_cidr             = "10.20.0.0/16"
  public_subnet_cidrs  = ["10.20.1.0/24", "10.20.2.0/24"]
  private_subnet_cidrs = ["10.20.11.0/24", "10.20.12.0/24"]
  enable_nat_gateway   = true
  availability_zones   = ["us-east-1a", "us-east-1b"]
}

jenkins = {
  instance_type          = "t3.small"
  ami_id                 = "ami-0c02fb55956c7d316"
  ssh_key_name           = "student-key"
  volume_size_gb         = 50
  admin_cidr_blocks      = ["0.0.0.0/0"]
  enable_codedeploy_agent = true
}

data = {
  artifact_bucket_name = "datapipeline-artifacts-main"
  enable_versioning    = true
  retention_days       = 90
}

apps = {
  datapipeline = {
    cpu               = 1024
    memory            = 2048
    desired_count     = 2
    container_port    = 8080
    image             = "public.ecr.aws/docker/library/python:3.11-slim"
    health_check_path = "/health"
    environment = {
      APP_ENV = "production"
      BRANCH  = "main"
    }
  }
  customer_app = {
    cpu               = 1024
    memory            = 2048
    desired_count     = 2
    container_port    = 3000
    image             = "public.ecr.aws/docker/library/nginx:latest"
    health_check_path = "/"
    environment = {
      APP_ENV = "production"
      BRANCH  = "main"
    }
  }
}

default_tags = {
  Owner       = "student"
  CostCenter  = "training"
  Compliance  = "internal"
  Criticality = "high"
}
