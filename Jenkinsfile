pipeline {
    agent any

    options {
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        TAG = "${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Préparation') {
            steps {
                sh '''
                    git config --global http.postBuffer 104857600
                    git config --global http.version HTTP/1.1
                    sudo chmod 666 /var/run/docker.sock || true  # Solution temporaire
                '''
                cleanWs()
            }
        }

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
                retry(5) {
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        extensions: [
                            [$class: 'CloneOption',
                             shallow: true,
                             depth: 1,
                             timeout: 30],
                            [$class: 'CleanBeforeCheckout']
                        ],
                        userRemoteConfigs: [[
                            url: 'https://github.com/WisalELALOUAN1/H2C',
                            credentialsId: ''
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
                    sh 'docker-compose -f $COMPOSE_FILE down || true'
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
            script {
                try {
                    sh 'docker-compose -f $COMPOSE_FILE down --remove-orphans || true'
                } catch (e) {
                    echo "Erreur lors du nettoyage Docker: ${e.message}"
                }
                cleanWs()
            }
        }
        success { 
            echo 'Build réussi! ✅' 
            // Ici vous pourriez ajouter une vraie notification si configurée
        }
        failure { 
            echo 'Échec du build - Consultez les logs ci-dessus pour détails ❌'
            // Retirez ou configurez slackSend si nécessaire
        }
    }
}
