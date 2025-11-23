#!/bin/bash
set -euo pipefail

apt-get update
apt-get install -y openjdk-17-jre-headless git docker.io unzip
usermod -aG docker ubuntu || true
systemctl enable docker
systemctl start docker

curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io.key | tee \ 
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \ 
https://pkg.jenkins.io/debian-stable binary/" | tee \ 
  /etc/apt/sources.list.d/jenkins.list > /dev/null

apt-get update
apt-get install -y jenkins
systemctl enable jenkins
systemctl start jenkins

# Install aws cli for pipeline orchestration
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip /tmp/awscliv2.zip -d /tmp
/tmp/aws/install

# Install terraform cli
TF_VERSION="1.6.6"
if ! command -v terraform >/dev/null 2>&1; then
  curl -fsSL "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip" \
    -o /tmp/terraform.zip
  unzip /tmp/terraform.zip -d /usr/local/bin
fi

# Optionally install the CodeDeploy agent for blue/green deployments
if [ "${enable_codedeploy_agent}" = "true" ]; then
  apt-get install -y ruby wget
  cd /tmp
  wget https://aws-codedeploy-${aws_region}.s3.${aws_region}.amazonaws.com/latest/install
  chmod +x ./install
  ./install auto
fi
