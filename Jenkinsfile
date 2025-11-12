// Jenkinsfile
// GitHub Copilot
// Declarative pipeline to build, scan, push and deploy a Docker image for a Python DAGs data-pipeline
// - Builds Docker image (Airflow, dbt, zookeeper, minio, neo4j, postgres, sonarqube integration assumed in image/docker-compose)
// - Runs unit and dbt tests inside container
// - Runs SonarQube scan
// - Pushes to AWS ECR
// - SSH deploy to a Docker host with docker-compose
// - Email alerts on success/failure
//
// Before running, create Jenkins credentials:
// - AWS_CREDENTIALS_ID : AWS Access Key/Secret (Username=accessKey, Password=secret)
// - SONARQUBE_TOKEN_ID : Secret text token for SonarQube
// - SSH_CREDENTIALS_ID  : SSH private key for deploy host
// Also configure the following environment variables in Jenkins or inject below:
// - ECR_ACCOUNT (aws account id), ECR_REGION, ECR_REPO_NAME, DEPLOY_HOST, DEPLOY_USER, EMAIL_RECIPIENTS

pipeline {
    agent any

    environment {
        IMAGE_NAME        = "${env.ECR_ACCOUNT}.dkr.ecr.${env.ECR_REGION}.amazonaws.com/${env.ECR_REPO_NAME}"
        BUILD_TAG         = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
        SONAR_HOST        = "${env.SONAR_HOST ?: 'http://sonarqube.example.com'}"
        // credential IDs placeholders - set these in Jenkins
        AWS_CREDS_ID      = 'AWS_CREDENTIALS_ID'
        SONAR_TOKEN_ID    = 'SONARQUBE_TOKEN_ID'
        SSH_CREDS_ID      = 'SSH_CREDENTIALS_ID'
        EMAIL_RECIPIENTS  = "${env.EMAIL_RECIPIENTS ?: 'devops-team@example.com'}"
        DEPLOY_HOST      = "${env.DEPLOY_HOST ?: 'ec2-user@aws-host'}"
        DEPLOY_DIR       = "${env.DEPLOY_DIR ?: '~/project-deploy'}"
        ECR_REGION       = "${env.ECR_REGION ?: 'us-east-1'}"
        ECR_REPO_NAME    = "${env.ECR_REPO_NAME ?: 'my-data-pipeline'}"
    }

    options {
        timestamps()
        ansiColor('xterm')
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '50'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                // sh 'git rev-parse --abbrev-ref HEAD || true'
                script { env.GIT_COMMIT = sh(returnStdout:true, script:'git rev-parse HEAD').trim() }
                echo "Checked out branch: ${env.GIT_BRANCH} Commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                        set -e
                        docker build -t ${IMAGE_NAME}:${BUILD_TAG} .
                        docker images | grep ${ECR_REPO_NAME} || true
                    """
                }
            }
        }

        stage('Unit Tests & DBT Tests') {
            steps {
                // run PYTHON tests inside container to guarantee same environment
                sh """
                    set -e
                    docker run --rm -v \$(pwd):/workspace -w /workspace ${IMAGE_NAME}:${BUILD_TAG} \
                        /bin/bash -lc "pip install -r requirements-test.txt || true; pytest -q || exit 1"
                """
                // run DBT tests if dbt project exists
                sh '''
                    if [ -d "dbt" ] ; then
                        docker run --rm -v $(pwd):/workspace -w /workspace/dbt ${IMAGE_NAME}:${BUILD_TAG} \
                            /bin/bash -lc "dbt deps && dbt seed --profiles-dir . --target test || true; dbt test --profiles-dir . --target test"
                    fi
                '''
            }
        }

        stage('SonarQube Scan') {
            steps {
                withCredentials([string(credentialsId: SONAR_TOKEN_ID, variable: 'SONAR_TOKEN')]) {
                    sh """
                        set -e
                        docker run --rm -v \$(pwd):/usr/src -w /usr/src sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=${env.JOB_NAME} \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=${SONAR_HOST} \
                            -Dsonar.login=${SONAR_TOKEN}
                    """
                }
            }
        }

        stage('Push Docker Image to AWS ECR') {
            steps {
                withCredentials([usernamePassword(credentialsId: AWS_CREDS_ID, usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                    sh """
                        set -e
                        aws configure set aws_access_key_id \$AWS_ACCESS_KEY_ID
                        aws configure set aws_secret_access_key \$AWS_SECRET_ACCESS_KEY
                        aws configure set region ${env.ECR_REGION}
                        aws ecr get-login-password --region ${env.ECR_REGION} | docker login --username AWS --password-stdin ${env.ECR_ACCOUNT}.dkr.ecr.${env.ECR_REGION}.amazonaws.com
                        aws ecr create-repository --repository-name ${env.ECR_REPO_NAME} --region ${env.ECR_REGION} || true
                        docker tag ${IMAGE_NAME}:${BUILD_TAG} ${IMAGE_NAME}:latest
                        docker push ${IMAGE_NAME}:${BUILD_TAG}
                        docker push ${IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Deploy to Remote Docker Host (ssh)') {
            steps {
                script {
                    // Assumes remote host runs docker-compose and has access to ECR (or will pull using aws login on remote)
                    sshagent(credentials: [SSH_CREDS_ID]) {
                        sh """
                            set -e
                            scp -o StrictHostKeyChecking=no docker-compose.yml ${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/docker-compose-${BUILD_TAG}.yml || true
                            ssh -o StrictHostKeyChecking=no ${DEPLOY_USER}@${DEPLOY_HOST} \\
                                "export AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID:-}' AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY:-}'; \\
                                 docker pull ${IMAGE_NAME}:${BUILD_TAG} || true; \\
                                 docker tag ${IMAGE_NAME}:${BUILD_TAG} ${IMAGE_NAME}:latest || true; \\
                                 cd /opt/your-app || true; \\
                                 docker-compose -f /tmp/docker-compose-${BUILD_TAG}.yml up -d --remove-orphans || docker-compose -f /tmp/docker-compose-${BUILD_TAG}.yml up -d"
                        """
                    }
                }
            }
        }

        stage('Post-deploy Smoke Tests') {
            steps {
                sh """
                    set -e
                    # Example smoke test: check HTTP health endpoint (adjust host/port/path)
                    timeout 30 bash -c 'until curl -fsS http://localhost:8080/health; do sleep 2; done'
                """
            }
        }
    }

    post {
        success {
            emailext (
                subject: "[Jenkins]SUCCESS: Job '${env.JOB_NAME} #[${env.BUILD_NUMBER}]- ${currentBuild.result}'",
                body: "Build and deployment succeeded. Job: ${env.BUILD_URL} \nBuild Result: ${currentBuild.result}\nProject: ${env.JOB_NAME}\nBranch: ${env.GIT_BRANCH}\n",
                to: "${EMAIL_RECIPIENTS}"
            )
        }
        failure {
            emailext (
                subject: "[Jenkins][FAILURE]: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
                body: """Build or deployment failed.
Job: ${env.BUILD_URL}
Please Check Jenkins console output for details.""",
                to: "${EMAIL_RECIPIENTS}"
            )
        }
        cleanup {
            sh 'docker image prune -af || true'
        }
    }
}