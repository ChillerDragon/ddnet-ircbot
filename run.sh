#!/bin/bash

docker stop ddnet_irc
docker build -t ddnet_irc . || exit 1
docker run -d --name ddnet_irc -t ddnet_irc || exit 1

