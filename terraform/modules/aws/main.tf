terraform {
  required_version = ">= 1.5.0"
}

locals {
  tags = merge({
    "Stack" = "aws"
  }, var.tags)
}

module "networking" {
  source = "./networking"

  project_name        = var.project_name
  environment         = var.environment
  vpc_cidr            = var.networking.vpc_cidr
  public_subnet_cidrs = var.networking.public_subnet_cidrs
  private_subnet_cidrs = var.networking.private_subnet_cidrs
  availability_zones  = var.networking.availability_zones
  enable_nat_gateway  = var.networking.enable_nat_gateway
  tags                = local.tags
}

module "data" {
  source = "./data"

  project_name          = var.project_name
  environment           = var.environment
  artifact_bucket_name  = var.data.artifact_bucket_name
  enable_versioning     = var.data.enable_versioning
  retention_days        = var.data.retention_days
  vpc_id                = module.networking.vpc_id
  tags                  = local.tags
}

module "jenkins" {
  source = "./jenkins"

  project_name       = var.project_name
  environment        = var.environment
  subnet_id          = module.networking.public_subnet_ids[0]
  vpc_id             = module.networking.vpc_id
  instance_type      = var.jenkins.instance_type
  ami_id             = var.jenkins.ami_id
  ssh_key_name       = var.jenkins.ssh_key_name
  volume_size_gb     = var.jenkins.volume_size_gb
  admin_cidr_blocks  = var.jenkins.admin_cidr_blocks
  enable_codedeploy_agent = var.jenkins.enable_codedeploy_agent
  aws_region         = var.aws_region
  tags               = local.tags
}

module "applications" {
  source = "./application"

  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  public_subnet_ids   = module.networking.public_subnet_ids
  apps                = var.apps
  aws_region          = var.aws_region
  tags                = local.tags
}

output "networking" {
  value = module.networking
}

output "artifact_store" {
  value = module.data
}

output "jenkins" {
  value = module.jenkins
}

output "applications" {
  value = module.applications
}
