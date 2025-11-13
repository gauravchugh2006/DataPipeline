variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "networking" {
  type = object({
    vpc_cidr             = string
    public_subnet_cidrs  = list(string)
    private_subnet_cidrs = list(string)
    enable_nat_gateway   = bool
    availability_zones   = list(string)
  })
}

variable "jenkins" {
  type = object({
    instance_type          = string
    ami_id                 = string
    ssh_key_name           = string
    volume_size_gb         = number
    admin_cidr_blocks      = list(string)
    enable_codedeploy_agent = bool
  })
}

variable "data" {
  type = object({
    artifact_bucket_name = string
    enable_versioning    = bool
    retention_days       = number
  })
}

variable "apps" {
  type = map(object({
    cpu               = number
    memory            = number
    desired_count     = number
    container_port    = number
    image             = string
    health_check_path = string
    environment       = map(string)
  }))
}

variable "tags" {
  type = map(string)
}
