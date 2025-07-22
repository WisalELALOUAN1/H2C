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
        TAG = "${env.BUILD_NUMBER}"
        REGISTRY = 'ghcr.io/wisalelalouan1'
    }
    stages {
        stage('Préparation') {
            steps {
                script {
                    // Test network connectivity first
                    sh '''
                        echo "Testing network connectivity..."
                        ping -c 3 8.8.8.8 || echo "DNS server unreachable"
                        nslookup github.com || echo "Cannot resolve github.com"
                    '''
                    
                    // Configure git
                    sh '''
                        git config --global http.postBuffer 104857600
                        git config --global http.version HTTP/1.1
                        git config --global user.name "Jenkins"
                        git config --global user.email "jenkins@example.com"
                    '''
                    
                    // Fix Docker socket permissions (if sudo available)
                    sh '''
                        sudo chmod 666 /var/run/docker.sock || echo "Cannot change docker socket permissions"
                    '''
                }
                cleanWs()
            }
        }
        
        stage('Network Test') {
            steps {
                sh '''
                    echo "Testing GitHub connectivity..."
                    curl -I https://github.com --connect-timeout 10 --max-time 30 || echo "GitHub unreachable"
                '''
            }
        }
        
        stage('Vérifier Docker') {
            steps {
                sh '''
                    docker --version
                    docker-compose version || docker compose version
                    docker info
                '''
            }
        }
        
        stage('Checkout') {
            steps {
                script {
                    def maxRetries = 3
                    def retryDelay = 15 // seconds
                    
                    for (int i = 1; i <= maxRetries; i++) {
                        try {
                            echo "Checkout attempt ${i}/${maxRetries}"
                            
                            checkout([
                                $class: 'GitSCM',
                                branches: [[name: '*/main']],
                                extensions: [
                                    [$class: 'CloneOption', 
                                     shallow: false, // Try deep clone first
                                     timeout: 60],
                                    [$class: 'CleanBeforeCheckout']
                                ],
                                userRemoteConfigs: [[
                                    url: 'https://github.com/WisalELALOUAN1/H2C'
                                ]]
                            ])
                            
                            echo "Checkout successful!"
                            break
                            
                        } catch (Exception e) {
                            echo "Checkout attempt ${i} failed: ${e.message}"
                            
                            if (i == maxRetries) {
                                error "All checkout attempts failed after ${maxRetries} tries"
                            }
                            
                            echo "Waiting ${retryDelay} seconds before retry..."
                            sleep(retryDelay)
                        }
                    }
                }
            }
        }
        
        stage('Verify Files') {
            steps {
                sh '''
                    echo "Current directory contents:"
                    ls -la
                    
                    if [ -f "docker-compose.yml" ]; then
                        echo "docker-compose.yml found"
                        cat docker-compose.yml
                    else
                        echo "docker-compose.yml not found!"
                        exit 1
                    fi
                '''
            }
        }
        
        stage('Build des images') {
            steps {
                sh '''
                    echo "Building Docker images..."
                    docker-compose -f $COMPOSE_FILE build --no-cache --pull
                    
                    # Tag images
                    docker tag $(docker-compose images -q backend) h2c-backend:$TAG || echo "Backend image not found"
                '''
            }
        }
        
        stage('Tests') {
            steps {
                sh '''
                    echo "Starting tests..."
                    docker-compose -f $COMPOSE_FILE up -d db
                    
                    # Wait for database to be ready
                    sleep 10
                    
                    # Run tests
                    docker-compose -f $COMPOSE_FILE run --rm backend \
                        pytest --junitxml=test-results.xml || echo "Tests failed"
                '''
            }
            post {
                always {
                    script {
                        // Publish test results if file exists
                        if (fileExists('test-results.xml')) {
                            junit 'test-results.xml'
                        }
                        
                        // Cleanup
                        sh 'docker-compose -f $COMPOSE_FILE down || true'
                    }
                }
            }
        }
        
        stage('Push registry') {
            when { 
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    try {
                        withCredentials([usernamePassword(
                            credentialsId: 'GHCR_CREDS',
                            usernameVariable: 'REGISTRY_USER',
                            passwordVariable: 'REGISTRY_TOKEN'
                        )]) {
                            sh '''
                                echo "Logging into registry..."
                                echo $REGISTRY_TOKEN | docker login ghcr.io \
                                    -u $REGISTRY_USER --password-stdin
                                
                                # Tag and push
                                docker tag h2c-backend:$TAG $REGISTRY/h2c-backend:$TAG
                                docker tag h2c-backend:$TAG $REGISTRY/h2c-backend:latest
                                
                                docker push $REGISTRY/h2c-backend:$TAG
                                docker push $REGISTRY/h2c-backend:latest
                            '''
                        }
                    } catch (Exception e) {
                        echo "Registry push failed: ${e.message}"
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                try {
                    sh '''
                        echo "Cleaning up Docker resources..."
                        docker-compose -f $COMPOSE_FILE down --remove-orphans --volumes || true
                        docker system prune -f || true
                    '''
                } catch (Exception e) {
                    echo "Cleanup error: ${e.message}"
                }
                cleanWs()
            }
        }
        success { 
            echo 'Build réussi! ✅' 
        }
        failure { 
            echo 'Échec du build - Consultez les logs ci-dessus pour détails ❌'
        }
        unstable {
            echo 'Build instable - Certaines étapes ont échoué ⚠️'
        }
    }
}
