variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "artifact_bucket_name" {
  type = string
}

variable "enable_versioning" {
  type = bool
}

variable "retention_days" {
  type = number
}

variable "vpc_id" {
  type = string
}

variable "tags" {
  type = map(string)
}
