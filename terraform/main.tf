terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80.0"
    }
  }
}

locals {
  is_aws   = lower(var.cloud_provider) == "aws"
  is_azure = lower(var.cloud_provider) == "azure"
}

provider "aws" {
  region              = var.aws_region
  profile             = var.aws_profile
  shared_credentials_files = var.aws_shared_credentials_files
  access_key          = var.aws_access_key
  secret_key          = var.aws_secret_key
  skip_metadata_api_check    = !local.is_aws
  skip_region_validation     = !local.is_aws
  skip_credentials_validation = !local.is_aws
  skip_requesting_account_id  = !local.is_aws
  default_tags {
    tags = merge({
      "Environment" = var.environment,
      "Project"     = var.project_name,
      "ManagedBy"   = "terraform"
    }, var.default_tags)
  }
}

provider "azurerm" {
  skip_provider_registration = true
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  client_id       = var.azure_client_id
  client_secret   = var.azure_client_secret
}

module "aws_stack" {
  source = "./modules/aws"
  count  = local.is_aws ? 1 : 0

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  networking = var.aws_networking
  jenkins    = var.jenkins
  data       = var.data
  apps       = var.apps
  tags       = var.default_tags
}

# Placeholder for a future Azure stack. Keeping the shape similar to the AWS module
# means that migrating providers will only require creating a matching module that
# consumes the same variable structures.
module "azure_stack" {
  source = "./modules/azure"
  count  = local.is_azure ? 1 : 0

  project_name = var.project_name
  environment  = var.environment
  region       = var.azure_region
  networking   = var.azure_networking
  jenkins      = var.jenkins
  data         = var.data
  apps         = var.apps
  tags         = var.default_tags
}
