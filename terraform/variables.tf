variable "project_name" {
  description = "Name of the overall project."
  type        = string
}

variable "environment" {
  description = "Deployment environment identifier (e.g., qa, main)."
  type        = string
  default     = "qa"
}

variable "cloud_provider" {
  description = "Target cloud provider. Supported values: aws, azure."
  type        = string
  default     = "aws"
}

variable "aws_region" {
  description = "AWS region to deploy resources to."
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "Optional shared credentials profile name."
  type        = string
  default     = null
}

variable "aws_shared_credentials_files" {
  description = "Optional list of shared credentials files."
  type        = list(string)
  default     = null
}

variable "aws_access_key" {
  description = "Optional AWS access key. Leave null to use ambient credentials."
  type        = string
  default     = null
  sensitive   = true
}

variable "aws_secret_key" {
  description = "Optional AWS secret key. Leave null to use ambient credentials."
  type        = string
  default     = null
  sensitive   = true
}

variable "azure_region" {
  description = "Azure region for future deployments."
  type        = string
  default     = "eastus"
}

variable "azure_subscription_id" {
  description = "Azure subscription identifier."
  type        = string
  default     = null
}

variable "azure_tenant_id" {
  description = "Azure tenant identifier."
  type        = string
  default     = null
}

variable "azure_client_id" {
  description = "Azure service principal client id."
  type        = string
  default     = null
}

variable "azure_client_secret" {
  description = "Azure service principal client secret."
  type        = string
  default     = null
  sensitive   = true
}

variable "aws_networking" {
  description = "Networking configuration for AWS."
  type = object({
    vpc_cidr              = string
    public_subnet_cidrs   = list(string)
    private_subnet_cidrs  = list(string)
    enable_nat_gateway    = bool
    availability_zones    = list(string)
  })
}

variable "azure_networking" {
  description = "Networking configuration placeholder for Azure deployments."
  type = object({
    address_space = list(string)
    subnets       = map(object({
      address_prefix = string
    }))
  })
  default = {
    address_space = ["10.20.0.0/16"]
    subnets = {
      web     = { address_prefix = "10.20.10.0/24" }
      backend = { address_prefix = "10.20.20.0/24" }
    }
  }
}

variable "jenkins" {
  description = "Jenkins server configuration."
  type = object({
    instance_type   = string
    ami_id          = string
    ssh_key_name    = string
    volume_size_gb  = number
    admin_cidr_blocks = list(string)
    enable_codedeploy_agent = bool
  })
}

variable "data" {
  description = "Shared data platform configuration."
  type = object({
    artifact_bucket_name = string
    enable_versioning    = bool
    retention_days       = number
  })
}

variable "apps" {
  description = "Application deployment configuration map."
  type = map(object({
    cpu              = number
    memory           = number
    desired_count    = number
    container_port   = number
    image            = string
    health_check_path = string
    environment      = map(string)
  }))
}

variable "default_tags" {
  description = "Additional default tags for all resources."
  type        = map(string)
  default     = {}
}
