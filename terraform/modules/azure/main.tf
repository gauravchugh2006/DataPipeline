locals {
  not_implemented_message = <<EOT
Azure deployment is not yet implemented. The project structure mirrors the AWS
module so that Azure specific resources can be created with the same inputs when
needed.
EOT
}

output "message" {
  value = local.not_implemented_message
}
