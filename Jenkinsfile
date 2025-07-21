pipeline {
    agent {
        label 'docker'  // Nécessite un nœud avec Docker installé
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))  // Réduit le stockage des builds
        timeout(time: 20, unit: 'MINUTES')  // Timeout global réduit
        timestamps()
    }

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        TAG = "${env.GIT_COMMIT.take(7)}"
        // Cache Docker pour accélérer les builds
        DOCKER_BUILDKIT = "1"
        COMPOSE_DOCKER_CLI_BUILD = "1"
    }

    stages {
        stage('Préparation') {
            steps {
                sh '''
                    docker --version
                    docker compose version
                    docker system df  # Vérifie l'espace disque
                '''
            }
        }

        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: env.GIT_BRANCH ?: 'main']],
                    extensions: [
                        [$class: 'CloneOption', depth: 1, shallow: true]  
                    ]
                ])
            }
        }

        stage('Tests backend') {
            steps {
                sh '''
                    # Lance seulement les services nécessaires
                    docker compose -f $COMPOSE_FILE up -d db redis  # Exemple de services dépendants
                    docker compose -f $COMPOSE_FILE run --rm -T backend \
                        pytest --junitxml=report_backend.xml -n auto  # Exécution parallèle des tests
                '''
            }
            post {
                always {
                    junit 'report_backend.xml'
                    sh 'docker compose -f $COMPOSE_FILE stop db redis'
                }
            }
        }

        stage('Build parallèle') {
            parallel {
                stage('Build Backend') {
                    steps {
                        sh '''
                            docker compose -f $COMPOSE_FILE build backend \
                                --progress=plain \
                                --build-arg BUILDKIT_INLINE_CACHE=1
                        '''
                    }
                }
                stage('Build Frontend') {
                    steps {
                        sh '''
                            docker compose -f $COMPOSE_FILE build frontend \
                                --progress=plain \
                                --build-arg BUILDKIT_INLINE_CACHE=1
                        '''
                    }
                }
            }
        }

        stage('Push Registry') {
            when { 
                branch 'main' 
                beforeAgent true  
            }
            environment {
                REGISTRY = 'ghcr.io/monorg'
                CACHE_TAG = 'latest'  // Tag pour le cache
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'GHCR_CREDS',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_TOKEN'
                )]) {
                    sh """
                        echo "\$REGISTRY_TOKEN" | docker login \$REGISTRY -u "\$REGISTRY_USER" --password-stdin
                        
                        # Tag et push avec cache
                        docker tag h2c-backend \$REGISTRY/h2c-backend:\$TAG
                        docker tag h2c-backend \$REGISTRY/h2c-backend:\$CACHE_TAG
                        
                        docker tag h2c-frontend \$REGISTRY/h2c-frontend:\$TAG
                        docker tag h2c-frontend \$REGISTRY/h2c-frontend:\$CACHE_TAG
                        
                        docker push \$REGISTRY/h2c-backend:\$TAG &
                        docker push \$REGISTRY/h2c-frontend:\$TAG &
                        wait  # Push parallèle
                        
                        docker push \$REGISTRY/h2c-backend:\$CACHE_TAG &
                        docker push \$REGISTRY/h2c-frontend:\$CACHE_TAG &
                        wait
                    """
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker compose -f $COMPOSE_FILE down --remove-orphans --volumes --timeout 1
                docker system prune -f --filter "until=24h"  # Nettoyage partiel
            '''
            cleanWs()
        }
    }
}