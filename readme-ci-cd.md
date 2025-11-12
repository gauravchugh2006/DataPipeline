
# Complete Two-Environment CI/CD Pipeline with SonarQube + AWS Free Tier

## Key Components

**📁 Documentation Created:**

- **two_env_cicd_sonarqube.md**: Complete guide covering AWS EC2 setup, Jenkins multibranch pipeline, SonarQube configuration, Jenkinsfile, GitHub webhooks, and deployment strategies
- **quick_setup_checklist.md**: 15-minute quick start with phase-by-phase setup, file checklist, testing procedures, and troubleshooting

---

## What's Included

✅ Two AWS EC2 instances (t2.micro free tier)  
✅ Branch-based CI/CD automation  
✅ SonarQube Community Edition  
✅ Docker build and push to Docker Hub
✅ Automatic SSH deployment to AWS EC2 instances
✅ Unit tests (pytest) + DBT tests in Docker
✅ Email notifications on success/failure
✅ Production-grade Jenkinsfile (declarative pipeline)
✅ GitHub webhook integration for auto-triggers


Quick Start (In Order)
Create AWS EC2 instances (qa and prod environments, t2.micro free tier)

Install Docker on both EC2 instances

Deploy your code to both (qa branch on QA EC2, main branch on Prod EC2)

Install Jenkins plugins (Multibranch Pipeline, SonarQube Scanner, Docker, SSH Agent)

Add Jenkins credentials (AWS, SonarQube tokens for both, SSH keys for both EC2s, Docker Hub)

Create SonarQube projects (data-pipeline-qa, data-pipeline-prod) and generate tokens

Create Jenkinsfile in your repo root (use the one provided)

Create Multibranch Pipeline job in Jenkins pointing to your GitHub repo

Add GitHub webhook to trigger Jenkins on push

Test by pushing to qa branch (auto-deploys) and main branch (requires approval)

## Files to Create

```
DataPipeline/
├── Jenkinsfile
├── sonar-project.properties
└── requirements-test.txt
```

## Verification Checklist
✅ Push to qa branch → Auto-deploys to QA EC2 within 2 minutes
✅ Push to main branch → Triggers Jenkins, waits for manual approval
✅ SonarQube shows code quality metrics for both data-pipeline-qa and data-pipeline-prod
✅ Airflow UI accessible at http://qa-ec2-ip:8080 and http://prod-ec2-ip:8080
✅ Docker containers running on both EC2 instances (docker-compose ps)
✅ Unit tests executed with `pytest --cov=dags --cov-report xml` and the resulting
  `coverage.xml` archived as a build artefact for SonarQube quality gates
✅ Email alerts sent on build success/failure

## This Setup Gives You
🎯 Enterprise-grade CI/CD pipeline for your data engineering project
🎯 Automatic deployment from git push (QA environment)
🎯 Gated production deployment with manual approval (Production environment)
🎯 Code quality scanning with SonarQube on every commit
🎯 Containerized consistency across all environments
🎯 Free tier compatible (AWS, SonarQube Community, Jenkins open-source)
🎯 Production-ready with proper error handling, logs, and notifications


## Architecture Overview

```
GitHub Repository Structure:
│
├── qa branch 
│   ├─ Trigger: Automatic on push
│   ├─ SonarQube: Scan (data-pipeline-qa project)
│   ├─ Testing: Unit tests + DBT tests in Docker
│   ├─ Build: Docker image build
│   ├─ Registry: Push to Docker Hub
│   └─ Deployment: AUTO-DEPLOY to QA EC2 (no approval)
│
└── main/master branch
    ├─ Trigger: Automatic on push
    ├─ SonarQube: Scan (data-pipeline-prod project)
    ├─ Testing: Unit tests + DBT tests in Docker
    ├─ Build: Docker image build
    ├─ Registry: Push to Docker Hub
    └─ Deployment: MANUAL APPROVAL REQUIRED → DEPLOY to Prod EC2
```

---

## Key Components

### Documentation Files

- **two_env_cicd_sonarqube.md**: Complete comprehensive guide covering:
  - AWS EC2 instance setup and configuration
  - Jenkins multibranch pipeline creation
  - SonarQube project setup and token generation
  - Full Jenkinsfile with environment-specific logic
  - GitHub webhook integration
  - Deployment strategies and monitoring

- **quick_setup_checklist.md**: Quick reference guide with:
  - 15-minute quick start (phase-by-phase setup)
  - File checklist and requirements
  - Testing procedures for each branch
  - Verification and validation steps
  - Troubleshooting guide

---

## Pipeline Features

### ✅ Supported Features

- **Two AWS EC2 instances** (t2.micro - free tier eligible)
- **Branch-based deployment automation** (qa auto-deploys, main requires approval)
- **SonarQube Community Edition** (free, open-source)
- **Docker containerization** (build, tag, and push)
- **Automatic SSH deployment** to AWS EC2 instances
- **Comprehensive testing** (pytest for unit tests, dbt for data tests)
- **Email notifications** (success and failure alerts)
- **Production-grade Jenkinsfile** (declarative pipeline)
- **GitHub webhook integration** (automatic trigger on push)
- **Docker Hub registry** (image storage and versioning)

---

## Quick Start Guide

### Step 1: AWS EC2 Setup

Create two EC2 instances with the following configuration:

- **Instance Type**: t2.micro (free tier eligible)
- **Operating System**: Ubuntu 24.04 LTS or Amazon Linux 2
- **Storage**: 20GB (within free tier limits)
- **Names**: 
  - `qa-data-pipeline-host` (QA environment)
  - `prod-data-pipeline-host` (Production environment)
- **Security Group Ports**: 22 (SSH), 8080 (Airflow), 5432 (PostgreSQL), 5439 (PostgreSQL DW)
- **Elastic IP**: Optional (recommended for static DNS)

### Step 2: Docker Installation

Install Docker and Docker Compose on both EC2 instances:

```bash
ssh -i your-key.pem ubuntu@<ec2-public-ip>

sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 3: Code Deployment

Deploy your project code to both EC2 instances:

**For QA Environment:**
```bash
cd ~
git clone https://github.com/your-username/DataPipeline.git
cd DataPipeline
git checkout qa
docker-compose up -d
```

**For Production Environment:**
```bash
cd ~
git clone https://github.com/your-username/DataPipeline.git
cd DataPipeline
git checkout main
docker-compose up -d
```

### Step 4: Jenkins Setup

Install and configure Jenkins plugins:

1. Navigate to Jenkins Dashboard
2. Go to **Manage Jenkins** → **Manage Plugins**
3. Install the following plugins:
   - Multibranch Pipeline
   - Pipeline (Declarative)
   - SonarQube Scanner
   - Docker Pipeline
   - Git
   - SSH Agent
   - Email Extension Plugin

### Step 5: Jenkins Credentials Configuration

Add credentials to Jenkins (Manage Jenkins → Manage Credentials → Global):

| Credential Name | Type | Details |
|-----------------|------|---------|
| `aws-credentials` | AWS Credentials | AWS Access Key ID and Secret Access Key |
| `sonarqube-token-qa` | Secret Text | SonarQube token for QA project |
| `sonarqube-token-prod` | Secret Text | SonarQube token for Production project |
| `ssh-qa-ec2` | SSH Username with private key | Private key for QA EC2 instance |
| `ssh-prod-ec2` | SSH Username with private key | Private key for Production EC2 instance |
| `docker-hub-credentials` | Username/Password | Docker Hub username and token |

### Step 6: SonarQube Configuration

Create SonarQube projects and generate authentication tokens:

1. Open SonarQube at `http://localhost:9003`
2. Login with default credentials: `admin` / `admin`
3. Create two projects:
   - **Project Key**: `data-pipeline-qa`
   - **Project Key**: `data-pipeline-prod`
4. For each project, generate a security token:
   - Navigate to **My Account** → **Security** → **Generate Token**
   - Copy the token and add to Jenkins credentials

### Step 7: Jenkins Multibranch Pipeline Job

Create a multibranch pipeline job in Jenkins:

1. Jenkins Dashboard → **New Item**
2. **Job Name**: `data-pipeline-cicd`
3. **Job Type**: Multibranch Pipeline
4. **Branch Source**: GitHub
   - **Repository URL**: `https://github.com/your-username/DataPipeline.git`
   - **Credentials**: Select your GitHub credentials
5. **Behaviors**: Filter branches
   - **Include**: `qa`, `main`, `master`
6. **Scan Trigger**: Set to GitHub hook trigger
7. **Save**

### Step 8: GitHub Webhook Setup

Configure GitHub to automatically trigger Jenkins on push:

1. Repository → **Settings** → **Webhooks**
2. **Payload URL**: `http://jenkins-server:8080/github-webhook/`
3. **Content Type**: `application/json`
4. **Trigger Events**: 
   - Push events
   - Pull request events
5. **Active**: ✓ (checked)
6. **Save**

### Step 9: Repository Files

Create the following files in your repository root:

**Jenkinsfile** (use the provided comprehensive Jenkinsfile)
**sonar-project.properties** (SonarQube configuration)
**requirements-test.txt** (Python test dependencies)

---

## Repository Structure

```
DataPipeline/
├── Jenkinsfile
├── sonar-project.properties
├── requirements-test.txt
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
├── dags/
│   ├── data_pipeline_dag.py
│   ├── generate_random_orders.py
│   └── ...
├── src/
│   └── ...
├── dbt/
│   └── ...
└── README.md
```

---

## Pipeline Workflow

### QA Branch Deployment (Automatic)

1. **Trigger**: Push to `qa` branch
2. **Checkout**: Clone code from GitHub
3. **Test**: Run pytest and dbt tests
4. **Scan**: SonarQube code quality analysis
5. **Build**: Create Docker image
6. **Push**: Upload image to Docker Hub
7. **Deploy**: Auto-deploy to QA EC2 via SSH

**No manual approval required**

### Production Branch Deployment (Manual Approval)

1. **Trigger**: Push to `main` or `master` branch
2. **Checkout**: Clone code from GitHub
3. **Test**: Run pytest and dbt tests
4. **Scan**: SonarQube code quality analysis
5. **Build**: Create Docker image
6. **Push**: Upload image to Docker Hub
7. **Wait**: Manual approval required in Jenkins UI
8. **Deploy**: Deploy to Production EC2 via SSH after approval

**Manual approval step prevents unintended production changes**

---

## Verification Checklist

After deployment, verify the following:

| Item | Verification | Expected |
|------|--------------|----------|
| **QA Deployment** | Push to `qa` branch | Auto-deploys within 2 minutes |
| **Production Trigger** | Push to `main` branch | Jenkins waits for manual approval |
| **SonarQube QA** | Check dashboard | Code metrics for `data-pipeline-qa` visible |
| **SonarQube Prod** | Check dashboard | Code metrics for `data-pipeline-prod` visible |
| **Airflow QA** | Open browser | `http://qa-ec2-ip:8080` accessible |
| **Airflow Prod** | Open browser | `http://prod-ec2-ip:8080` accessible |
| **Docker Status QA** | SSH to QA EC2 | `docker-compose ps` shows all services running |
| **Docker Status Prod** | SSH to Prod EC2 | `docker-compose ps` shows all services running |
| **Email Alerts** | Check email | Notifications received on build success/failure |
| **SonarQube Login** | Access UI | `http://localhost:9003/projects` shows both projects |

---

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| SSH connection refused | EC2 security group doesn't allow SSH | Add port 22 to security group from Jenkins IP |
| Docker command not found | User not in docker group | Run `sudo usermod -aG docker ubuntu && newgrp docker` |
| SonarQube connection error | Port 9003 not accessible or container not running | Verify port mapping and container status |
| GitHub webhook not triggering | Webhook URL incorrect or firewall blocking | Verify webhook URL in GitHub and test delivery |
| Permission denied on SSH key | SSH key file has wrong permissions | Run `chmod 600 ~/.ssh/key.pem` |
| Docker push fails | Docker Hub authentication failed | Verify credentials in Jenkins and Docker Hub token |
| Deployment takes too long | EC2 pulling large Docker images | Check internet speed and image size |

---

## Benefits of This Setup

### 🎯 Enterprise-Grade Pipeline

Professional-level CI/CD automation suitable for production data engineering workloads

### 🎯 Automatic QA Deployment

QA changes deploy automatically on push, enabling rapid testing and feedback

### 🎯 Gated Production Deployment

Production changes require manual approval, preventing accidental rollouts

### 🎯 Code Quality Scanning

SonarQube analyzes every commit, identifying bugs, vulnerabilities, and code smells

### 🎯 Containerized Consistency

Docker ensures identical environments across QA, production, and local development

### 🎯 Free Tier Compatible

All components use free tier options:
- AWS EC2 t2.micro (12 months free)
- SonarQube Community Edition (open-source)
- Jenkins (open-source)
- GitHub webhooks (included)

### 🎯 Production-Ready

Includes proper error handling, logging, notifications, and monitoring

---

## Deployment Commands Reference

### Manual QA Deployment

```bash
# Push to QA branch
git checkout qa
git add .
git commit -m "Your feature"
git push origin qa

# Jenkins automatically deploys within 2 minutes
```

### Manual Production Deployment

```bash
# Push to main branch
git checkout main
git add .
git commit -m "Release v1.0"
git push origin main

# Jenkins triggers, but waits for manual approval
# Go to Jenkins UI → Click Approve button
# Deployment proceeds to Production EC2
```

### Monitor QA Environment

```bash
ssh -i qa-key.pem ubuntu@qa-ec2-ip
cd ~/DataPipeline
docker-compose ps
docker-compose logs airflow_scheduler
```

### Monitor Production Environment

```bash
ssh -i prod-key.pem ubuntu@prod-ec2-ip
cd ~/DataPipeline
docker-compose ps
docker-compose logs airflow_scheduler
```

---

## Next Steps

1. ✅ Set up AWS EC2 instances following Part 1 of comprehensive guide
2. ✅ Install Docker on both EC2 instances
3. ✅ Configure Jenkins with required plugins and credentials
4. ✅ Set up SonarQube projects and generate tokens
5. ✅ Create Jenkinsfile in your repository
6. ✅ Configure GitHub webhooks
7. ✅ Test QA pipeline by pushing to `qa` branch
8. ✅ Test Production pipeline by pushing to `main` branch
9. ✅ Monitor deployments and adjust as needed
10. ✅ Set up email notifications for team

---

## Support and Resources

- **Jenkins Documentation**: https://www.jenkins.io/doc/
- **SonarQube Documentation**: https://docs.sonarsource.com/sonarqube/latest/
- **GitHub Webhooks**: https://docs.github.com/en/developers/webhooks-and-events
- **AWS EC2 Free Tier**: https://aws.amazon.com/free/
- **Docker Documentation**: https://docs.docker.com/

---

## Conclusion

This two-environment CI/CD pipeline provides a production-ready, enterprise-grade solution for continuous integration and deployment of your data engineering project. With automatic testing, code quality scanning, and branch-based deployment strategies, your team can maintain high code quality while enabling rapid development and safe production releases.

**Your professional CI/CD pipeline is ready for deployment! 🚀**

