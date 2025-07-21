pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timestamps()
    }

    environment {
        // Configuration Docker pour Windows
        DOCKER_HOST = "npipe:////./pipe/docker_engine"
        COMPOSE_FILE = "docker-compose.yml"
        TAG = "${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Vérifier Docker') {
            steps {
                script {
                    try {
                        bat 'docker --version'
                        bat 'docker compose version'
                    } catch (Exception e) {
                        error("Docker n'est pas disponible. Erreur: ${e.message}")
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build des images') {
            steps {
                bat """
                    docker compose -f %COMPOSE_FILE% build --no-cache
                    docker tag h2c-backend h2c-backend:%TAG%
                """
            }
        }

        stage('Tests') {
            steps {
                bat """
                    docker compose -f %COMPOSE_FILE% up -d db
                    docker compose -f %COMPOSE_FILE% run --rm backend pytest --junitxml=test-results.xml
                """
            }
            post {
                always {
                    junit 'test-results.xml'
                    bat 'docker compose -f %COMPOSE_FILE% down'
                }
            }
        }

        stage('Déploiement') {
            when { branch 'main' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'GHCR_CREDS',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_TOKEN'
                )]) {
                    bat """
                        echo %REGISTRY_TOKEN% | docker login ghcr.io -u %REGISTRY_USER% --password-stdin
                        docker tag h2c-backend:%TAG% ghcr.io/votre-org/h2c-backend:%TAG%
                        docker push ghcr.io/votre-org/h2c-backend:%TAG%
                    """
                }
            }
        }
    }

    post {
        always {
            bat 'docker compose -f %COMPOSE_FILE% down --remove-orphans || true'
            cleanWs()
        }
        success {
            echo 'Build réussi! Accédez à Jenkins: http://localhost:9090'
        }
        failure {
            echo 'Échec du build. Consultez les logs pour plus de détails.'
        }
    }
}