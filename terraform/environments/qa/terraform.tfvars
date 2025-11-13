project_name   = "datapipeline"
environment    = "qa"
cloud_provider = "aws"
aws_region     = "us-east-1"

aws_networking = {
  vpc_cidr             = "10.10.0.0/16"
  public_subnet_cidrs  = ["10.10.1.0/24", "10.10.2.0/24"]
  private_subnet_cidrs = ["10.10.11.0/24", "10.10.12.0/24"]
  enable_nat_gateway   = false
  availability_zones   = ["us-east-1a", "us-east-1b"]
}

jenkins = {
  instance_type          = "t3.micro"
  ami_id                 = "ami-0c02fb55956c7d316"
  ssh_key_name           = "student-key"
  volume_size_gb         = 30
  admin_cidr_blocks      = ["0.0.0.0/0"]
  enable_codedeploy_agent = false
}

data = {
  artifact_bucket_name = "datapipeline-artifacts-qa"
  enable_versioning    = true
  retention_days       = 30
}

apps = {
  datapipeline = {
    cpu               = 512
    memory            = 1024
    desired_count     = 1
    container_port    = 8080
    image             = "public.ecr.aws/docker/library/python:3.11-slim"
    health_check_path = "/health"
    environment = {
      APP_ENV = "qa"
      BRANCH  = "qa"
    }
  }
  customer_app = {
    cpu               = 512
    memory            = 1024
    desired_count     = 1
    container_port    = 3000
    image             = "public.ecr.aws/docker/library/nginx:latest"
    health_check_path = "/"
    environment = {
      APP_ENV = "qa"
      BRANCH  = "qa"
    }
  }
}

default_tags = {
  Owner       = "student"
  CostCenter  = "training"
  Compliance  = "internal"
}
