variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "subnet_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "ami_id" {
  type = string
}

variable "ssh_key_name" {
  type = string
}

variable "volume_size_gb" {
  type = number
}

variable "aws_region" {
  type = string
}

variable "admin_cidr_blocks" {
  type = list(string)
}

variable "enable_codedeploy_agent" {
  type    = bool
  default = false
}

variable "tags" {
  type = map(string)
}
