pipeline {
    agent any

    options {
        timeout(time: 60, unit: 'MINUTES')  // Augmentation du timeout global
        buildDiscarder(logRotator(numToKeepStr: '5'))
        timestamps()
        disableConcurrentBuilds()  // Évite les conflits de builds
    }

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
        TAG = "${env.GIT_COMMIT.take(7)}"
        GIT_SSL_NO_VERIFY = 'true'  // Optionnel: seulement si problèmes de certificats
    }

    stages {
        stage('Préparation') {
            steps {
                sh '''
                    git config --global http.postBuffer 104857600  # Augmente le buffer HTTP
                    git config --global http.version HTTP/1.1      # Désactive HTTP/2
                '''
                cleanWs()  // Nettoie le workspace avant le checkout
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
                retry(5) {  // Augmentation du nombre de tentatives
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        extensions: [
                            [$class: 'CloneOption', 
                             shallow: true,
                             depth: 1,
                             timeout: 30,  // Timeout en minutes
                             noTags: true],
                            [$class: 'CleanBeforeCheckout'],
                            [$class: 'GitLFSPull']  // Important si vous utilisez LFS
                        ],
                        userRemoteConfigs: [[
                            url: 'https://github.com/WisalELALOUAN1/H2C',
                            credentialsId: '',  // À remplir si nécessaire
                            timeout: 30  // Timeout en minutes
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
            echo 'Build réussi! ' 
        }
        failure { 
            echo 'Échec du build - Consultez les logs ci-dessus pour détails ' 
            slackSend(color: 'danger', message: "Échec du build: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
        }
    }
}
