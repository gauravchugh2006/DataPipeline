output "networking" {
  value = module.networking
}

output "artifact_bucket" {
  value = module.data.bucket
}

output "jenkins_public_ip" {
  value = module.jenkins.public_ip
}

output "jenkins_url" {
  value = module.jenkins.jenkins_url
}

output "application_endpoints" {
  value = module.applications.endpoints
}
