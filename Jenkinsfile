pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timestamps()
    }

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        TAG = "${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
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
            post { always { junit 'report_backend.xml' } }
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
    when { branch 'main' }
    environment {
        // Ça peut rester ton chemin complet, ou juste ghcr.io si tu préfères
        REGISTRY = 'ghcr.io/monorg'
    }
    steps {
        // On bind la credential GHCR_CREDS sur deux variables
        withCredentials([usernamePassword(
            credentialsId: 'GHCR_CREDS',
            usernameVariable: 'REGISTRY_USER',
            passwordVariable: 'REGISTRY_TOKEN'
        )]) {
            sh """
              # On se loggue avec USER + TOKEN
              echo "$REGISTRY_TOKEN" \
                | docker login $REGISTRY -u "$REGISTRY_USER" --password-stdin

              # On tague les images avec le bon nom complet
              docker tag h2c-backend:$TAG  $REGISTRY/h2c-backend:$TAG
              docker tag h2c-frontend:$TAG $REGISTRY/h2c-frontend:$TAG

              # Et on push
              docker push $REGISTRY/h2c-backend:$TAG
              docker push $REGISTRY/h2c-frontend:$TAG
            """
        }
    }
    }

    post {
        always {
            sh 'docker compose -f $COMPOSE_FILE down -v || true'
        }
    }
}
