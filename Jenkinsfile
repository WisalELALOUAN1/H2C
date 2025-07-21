pipeline {
    agent {
        label 'docker'  // Utilise un nœud Jenkins avec le label 'docker'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps()
    }

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        TAG = "${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Vérifier Docker') {
            steps {
                sh '''
                    docker --version || { echo "ERREUR: Docker non installé"; exit 1; }
                    docker compose version || { echo "ERREUR: Docker Compose non installé"; exit 1; }
                '''
            }
        }

        stage('Checkout') {
            steps { 
                checkout scm 
            }
        }

        stage('Tests backend') {
            steps {
                sh '''
                    docker compose -f $COMPOSE_FILE up -d db
                    docker compose -f $COMPOSE_FILE run --rm backend \
                       pytest --junitxml=report_backend.xml
                    docker compose -f $COMPOSE_FILE down -v
                '''
            }
            post { 
                always { 
                    junit 'report_backend.xml' 
                } 
            }
        }

        stage('Build images') {
            steps {
                sh '''
                    docker compose -f $COMPOSE_FILE build backend frontend
                    docker tag h2c-backend  h2c-backend:$TAG
                    docker tag h2c-frontend h2c-frontend:$TAG
                '''
            }
        }

        stage('Push registry') {
            when { 
                branch 'main' 
            }
            environment {
                REGISTRY = 'ghcr.io/monorg'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'GHCR_CREDS',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_TOKEN'
                )]) {
                    sh """
                        echo "$REGISTRY_TOKEN" | docker login $REGISTRY -u "$REGISTRY_USER" --password-stdin
                        docker tag h2c-backend:$TAG  $REGISTRY/h2c-backend:$TAG
                        docker tag h2c-frontend:$TAG $REGISTRY/h2c-frontend:$TAG
                        docker push $REGISTRY/h2c-backend:$TAG
                        docker push $REGISTRY/h2c-frontend:$TAG
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker compose -f $COMPOSE_FILE down -v || true'
            cleanWs()  // Nettoyer l'espace de travail
        }
    }
}