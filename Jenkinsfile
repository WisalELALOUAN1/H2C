pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timestamps()
    }

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        TAG          = "${env.GIT_COMMIT.take(7)}"
    }

    stages {

        stage('Vérifier Docker') {
            steps {
                sh '''
                    docker --version
                    docker-compose version
                '''
            }
        }

stage('Checkout') {
    steps {
        retry(3) {
            checkout([
                $class: 'GitSCM',
                branches: [[name: '*/main']],
                extensions: [
                    [$class: 'CloneOption', 
                     shallow: true,  
                     depth: 1,      
                     timeout: 60]
                  
                ],
                userRemoteConfigs: [[
                    url: 'https://github.com/WisalELALOUAN1/H2C',
                    credentialsId: '' // Ajoutez un credential si nécessaire
                ]]
            ])
        }
    }
}

        stage('Build des images') {
            steps {
                sh '''
                    docker-compose -f $COMPOSE_FILE build --no-cache
                    docker tag h2c-backend h2c-backend:$TAG
                '''
            }
        }

        stage('Tests') {
            steps {
                sh '''
                    docker-compose -f $COMPOSE_FILE up -d db
                    docker-compose -f $COMPOSE_FILE run --rm backend \
                        pytest --junitxml=test-results.xml
                '''
            }
            post {
                always {
                    junit 'test-results.xml'
                    sh 'docker-compose -f $COMPOSE_FILE down'
                }
            }
        }

        stage('Push registry') {
            when { branch 'main' }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'GHCR_CREDS',
                    usernameVariable: 'REGISTRY_USER',
                    passwordVariable: 'REGISTRY_TOKEN'
                )]) {
                    sh '''
                        echo $REGISTRY_TOKEN | docker login ghcr.io \
                            -u $REGISTRY_USER --password-stdin

                        docker tag h2c-backend:$TAG \
                            ghcr.io/WisalELALOUAN1/h2c-backend:$TAG

                        docker push ghcr.io/WisalELALOUAN1/h2c-backend:$TAG
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker-compose -f $COMPOSE_FILE down --remove-orphans || true'
            cleanWs()
        }

        success { echo ' Build réussi !' }
        failure { echo ' Échec du build – consultez les logs.' }

    }
}
