pipeline {
    agent any
    environment {
        registry = "837577998611.dkr.ecr.us-west-2.amazonaws.com/kpi"
        clustername = "eks-sbs-dev"
        region = "us-west-2"
        ns = "sbsdev"
        ecrauth = "aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 837577998611.dkr.ecr.us-west-2.amazonaws.com"
       }
	   
    stages {
        stage('Checkout') {
            steps {
                cleanWs()
                checkout scmGit(branches: [[name: '*/$release_branch']], extensions: [], userRemoteConfigs: [[credentialsId: 'jenkins-github-token-as-password', url: 'https://github.com/OpenClinica/kpi.git']])
            }
        }
        stage('Fetch ECR Credentials') {
            steps {
                script {
                    sh "${ecrauth}"
                    sh "df -h"
                }
            }
        }
        stage('Configure EKS Cluster') {
            steps {
                sh '/usr/local/bin/eksctl version'
                sh '/usr/local/bin/eksctl utils write-kubeconfig --cluster=${clustername} --region=${region}'
                sh "ssh -J root@sbs-dev-jump -D 1094 -f root@eks-maintenance-dev -N"
            }
        }
        stage ("Build and Push Image to ECR") {
            environment {
                REMOTE_AMD_HOST_IP = "172.24.20.170"
            }
            steps {
              script {
                if ( env.ENV == "build" || env.ENV == "build & deploy") {
                    sh """
                        # Unset DOCKER_HOST to ensure commands target the local Docker daemon by default
                        unset DOCKER_HOST
                        if docker buildx inspect multiarchbuilder > /dev/null 2>&1; then
                            docker buildx rm multiarchbuilder
                        fi
                        docker buildx create --name multiarchbuilder --node arm64 --platform linux/aarch64,linux/amd64
                        docker buildx create --name multiarchbuilder --append --node amd64 --platform linux/amd64 tcp://${REMOTE_AMD_HOST_IP}:2375
                        docker buildx inspect --bootstrap --builder multiarchbuilder
                       """
                    sh "docker buildx build --builder multiarchbuilder --platform linux/amd64,linux/aarch64 -t ${registry}:${tag_version} --push ."
                  }
                else {
                    sh "echo 'Skipping this step'" 
                }    
             }
           }
        }       
        stage ("Sanitize Workspace") {
            steps {
                cleanWs()
            }

        }
        stage ('Helm checkout') {
            steps {
                script {
                if ( env.ENV == "build & deploy" || env.ENV == "deploy" )
                {
                checkout scmGit(branches: [[name: '*/main']], extensions: [], userRemoteConfigs: [[credentialsId: 'jenkins-github-token-as-password', url: 'https://github.com/OpenClinica/container-ops.git']])
                }
                 else {
                sh "echo 'Skipping this step'" 
                }        
              }
            }
           }         
        stage('Deploy Helm Chart') {
            steps {
               script {
                if ( env.ENV == "build & deploy" || env.ENV == "deploy" )
                {
                sh "https_proxy=socks5://127.0.0.1:1094 /usr/local/bin/helm upgrade formdesigner --install apps/kobo_kpi --values apps/kobo_kpi/values-dev.yaml --namespace ${ns} --set kpi.image.repository=${registry} --set kpi.image.tag=${tag_version}"
                }
                else {
                sh "echo 'Skipping this step'" 
                }        
             }
          }
      }
   }
}
