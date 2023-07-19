#!/bin/bash

if [ ! -f .env.staging ]
then
	echo "Error: missing .env.staging file"
	exit 1
fi

mkdir -p tmp

podman stop staging_ddnet_irc
podman rm staging_ddnet_irc
sed '/^CMD .*/i COPY .env.staging .env' Dockerfile > tmp/Dockerfile.staging
podman build -t staging_ddnet_irc -f tmp/Dockerfile.staging . || exit 1
podman run -d --name staging_ddnet_irc -t staging_ddnet_irc || exit 1

