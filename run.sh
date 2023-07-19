#!/bin/bash

# # sudo iptables -N DOCKER
# # sudo iptables -N DOCKER-ISOLATION
# # sudo iptables -N DOCKER-USER
# # sudo iptables -A DOCKER-ISOLATION -j RETURN
# # sudo iptables -A DOCKER-USER -i eth0 -p tcp -m tcp --dport 3306 -j DROP
# # sudo iptables -A DOCKER-USER -j RETURN
# 
# # sudo iptables -N DOCKER-USER
# # sudo iptables -I DOCKER-USER -p tcp --dport 6667 -j ACCEPT
# # sudo iptables -A DOCKER-USER -i lo -j ACCEPT
# # sudo iptables -A DOCKER-USER -j DROP
# 
# while read -r rule
# do
# 	[[ "$rule" == "DOCKER-USER" ]] && continue
# 
# 	sudo iptables -D $rule
# done < <(sudo iptables -S DOCKER-USER | grep -o DOCKER-USER.*)
# 
# host_iface="$(route | grep '^default' | grep -o '[^ ]*$')"
# 
# if [ "$host_iface" == "" ]
# then
# 	echo "Error: failed to get host network interface"
# 	exit 1
# fi
# 
# # allow only irc port
# # sudo iptables -A DOCKER-USER -i "$host_iface" -p tcp -m conntrack --ctorigdstport 6667 --ctdir ORIGINAL -j DROP || exit 1
# # sudo iptables -A DOCKER-USER -i "$host_iface" -p udp -m conntrack --ctorigdstport 53 --ctdir ORIGINAL -j DROP || exit 1
# 
# sudo iptables -A DOCKER-USER -i "$host_iface" -p udp -m conntrack --ctorigdstport 53 --ctdir ORIGINAL -j ACCEPT || exit 1
# sudo iptables -A DOCKER-USER -i "$host_iface" -p tcp -m conntrack --ctorigdstport 53 --ctdir ORIGINAL -j ACCEPT || exit 1
# sudo iptables -A DOCKER-USER -i "$host_iface" -p udp -m conntrack --ctorigdstport 6667 --ctdir ORIGINAL -j ACCEPT || exit 1
# 
# sudo iptables -A DOCKER-USER -i "$host_iface" -p udp --dport 53 -j ACCEPT || exit 1
# sudo iptables -A DOCKER-USER -i "$host_iface" -p tcp --dport 53 -j ACCEPT || exit 1
# sudo iptables -A DOCKER-USER -i "$host_iface" -p tcp --dport 6667 -j ACCEPT || exit 1
# 
# sudo iptables -A DOCKER-USER -i lo -j ACCEPT || exit 1
# 
# 
# # irc stockholm 
# sudo iptables -A DOCKER-USER -i "$host_iface" -s 188.240.145.70 -j ACCEPT || exit 1
# # sudo iptables -A DOCKER-USER -i "$host_iface" ! -s 188.240.145.70 -j DROP || exit 1
# 
# # deb.debian.org
# # sudo iptables -A DOCKER-USER -i "$host_iface" ! -s 146.75.118.132 -j DROP || exit 1
# 
# sudo iptables -A DOCKER-USER -j DROP || exit 1
# 
# sudo iptables -S DOCKER-USER

podman stop ddnet_irc
podman rm ddnet_irc
podman build -t ddnet_irc . || exit 1
podman run -d --name ddnet_irc -t ddnet_irc || exit 1

