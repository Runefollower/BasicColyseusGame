#!/bin/bash

# Install security updates
yum -y --security update

# Install nginx
amazon-linux-extras install nginx1 -y

# Configure nginx
# TODO needs a script or deploy step to get actual configuration
# location /BasicGameServer/ {
#         proxy_pass http://localhost:3000/;
# proxy_http_version 1.1;
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection 'upgrade';
# proxy_set_header Host $host;
# proxy_cache_bypass $http_upgrade;
# proxy_read_timeout 86400s;
# proxy_send_timeout 86400s;
# }

# Enable nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# install node 16
curl -sL https://rpm.nodesource.com/setup_16.x | sudo -E bash -
sudo yum install -y nodejs

nvm use 16

# Temporarily install git
sudo yum install -y git

# Get the repo
mkdir /home/ec2-user/projects
cd /home/ec2-user/projects
git clone https://github.com/Runefollower/BasicColyseusGame.git

# Build the repo
cd /home/ec2-user/projects/BasicColyseusGame
npm install
npm run build:server
npm run build:client

sudo npm install -g forever
sudo forever start dist/server/SimpleGameRoom.js

# Install CodeDeploy Agent
# yum -y install ruby
# yum -y install wget
# cd /home/ec2-user
# wget https://aws-codedeploy-eu-central-1.s3.amazonaws.com/latest/install
# chmod +x ./install
# ./install auto
# rm ./install

# cat <<EOF > /etc/codedeploy-agent/conf/codedeploy.onpremises.yml
# ---
# aws_access_key_id: <ACCESS_KEY>
# aws_secret_access_key: <SECRET_ACCESS_KEY>
# iam_user_arn: <IAM_USER_ARN>
# region: <AWS_REGION>
# EOF

# service codedeploy-agent restart