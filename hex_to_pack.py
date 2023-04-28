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

packet = 'error'
try:
    packet = twnet_parser.packet.parse7(data)
except:
    pass

print(packet)

