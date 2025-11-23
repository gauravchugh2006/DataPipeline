variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "public_subnet_ids" {
  type = list(string)
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

variable "aws_region" {
  type = string
  default = "us-east-1"
}
