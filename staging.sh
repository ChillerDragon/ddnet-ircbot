#!/bin/bash

if [ ! -f .env.staging ]
then
	echo "Error: missing .env.staging file"
	exit 1
fi

mkdir -p tmp

docker stop staging_ddnet_irc
docker rm staging_ddnet_irc
sed '/^CMD .*/i COPY .env.staging .env' Dockerfile > tmp/Dockerfile.staging
docker build -t staging_ddnet_irc -f tmp/Dockerfile.staging . || exit 1
docker run -d --name staging_ddnet_irc -t staging_ddnet_irc || exit 1

