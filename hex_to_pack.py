#!/usr/bin/env python3

import sys

import twnet_parser.packet

if len(sys.argv) == 1:
    print("provide tw traffix hex like this: 04 0a 00 cf 2e de 1d 04")
    sys.exit(1)

try:
    data = bytearray.fromhex(sys.argv[1])
except ValueError:
    print('invalid hex')
    sys.exit(1)

# data = "02 7e 01 48 1f 93 d7 40 10 0a 80 01 6f 70 74 69 6f 6e 00 74 65 73 74 00 00 00"
# data = bytearray.fromhex(data)

try:
    packet = twnet_parser.packet.parse7(data)
except:
    print('error')
    sys.exit(1)

def code(msg):
    print(f"```{msg}```")

code(packet)
code(packet.header)
for msg in packet.messages:
    code(msg)

