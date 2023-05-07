#!/usr/bin/env python3

import sys
import time

import re
import ast
from binascii import hexlify
import string

import twnet_parser.packet

def str_to_bytes(data):
    data = data.strip()
    if re.match('^b[\'\"].*[\'\"]$', data):
        return ast.literal_eval(data)

    if re.match('^0x', data):
        data = data.replace('0x', '')

    data = bytes(bytearray.fromhex(data))
    return data

# data = r"b'\x04\x00\x011\xe4\xc3\xd6\x00\x19\x030.7 802f1be60a05665f\x00\x00\x85\x1c'"
# print(str_to_bytes(data))
# data = "02 7e 01 48 1f 93 d7 40 10 0a 80 01 6f 70 74 69 6f 6e 00 74 65 73 74 00 00 00"
# print(str_to_bytes(data))
# data = "0x02 0xff 0x03"
# print(str_to_bytes(data))

if len(sys.argv) == 1:
    print("provide tw traffix hex like this: 04 0a 00 cf 2e de 1d 04")
    sys.exit(1)

try:
    data = str_to_bytes(data)
except ValueError:
    print('invalid hex')
    sys.exit(1)

try:
    packet = twnet_parser.packet.parse7(data)
except:
    print('error')
    sys.exit(1)

def code(msg):
    print(f"```{msg}```")
    sys.stdout.flush()

code(packet.version)
time.sleep(1)
code(packet.header)
time.sleep(3)
for msg in packet.messages:
    time.sleep(2)
    code(msg)

