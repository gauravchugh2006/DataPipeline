output "aws_stack" {
  description = "Key outputs from the AWS deployment."
  value = try(module.aws_stack[0], null)
}

output "azure_stack" {
  description = "Placeholder output for the Azure deployment."
  value = try(module.azure_stack[0], null)
}
