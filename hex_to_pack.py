#!/usr/bin/env python3

import sys
import time

import re
import ast
from binascii import hexlify
import string
from importlib.metadata import version

import dpkt
import twnet_parser.packet

def str_to_bytes(data):
    data = data.strip()
    if re.match('^b[\'\"].*[\'\"]$', data):
        return ast.literal_eval(data)

    if re.match('^0x', data):
        data = data.replace('0x', '')

    data = bytes(bytearray.fromhex(data))
    return data

# data = """  4500 0035 1aeb 4000 4011 21cb 7f00 0001
#   7f00 0001 f367 206f 0021 fe34 100c 0142
#     780d 8855 e9f0 87e6 0768 d6d0 5bf8 692f
#       ff8c 1437 00
#       """
# print(str_to_bytes(data).hex(sep = " ")) == "45 00 00 35 1a eb 40 00 40 11 21 cb 7f 00 00 01 7f 00 00 01 f3 67 20 6f 00 21 fe 34 10 0c 01 42 78 0d 88 55 e9 f0 87 e6 07 68 d6 d0 5b f8 69 2f ff 8c 14 37 00"
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
    data = str_to_bytes(sys.argv[1])
except ValueError:
    print('invalid hex')
    sys.exit(1)

def code(msg):
    print(f"```{msg}```")
    sys.stdout.flush()

udp_payload = data
try:
    ip = dpkt.ethernet.Ethernet(data).data
    if not isinstance(ip.data, dpkt.udp.UDP):
        raise ValueError("not udp")
    udp_payload = ip.data.data
    code("extracting udp payload from ethernet packet ...")
    time.sleep(1)
except:
    pass
try:
    ip = dpkt.ip.IP(data)
    if not isinstance(ip.data, dpkt.udp.UDP):
        raise ValueError("not udp")
    udp_payload = ip.data.data
    code("extracting udp payload from ip packet ...")
    time.sleep(1)
except:
    pass

data = udp_payload

code(f"[twnet_parser v{version('twnet_parser')}] udp payload: {data.hex(sep = ' ')}")

def print_packet(packet):
    code(packet.header)
    time.sleep(3)
    for msg in packet.messages:
        time.sleep(2)
        code(msg)

time.sleep(2)
code("--- 0.7")
time.sleep(1)
try:
    packet = twnet_parser.packet.parse7(data)
    print_packet(packet)
except:
    print('error')

time.sleep(2)
code("--- 0.6")
time.sleep(1)
try:
    packet = twnet_parser.packet.parse6(data)
    print_packet(packet)
except:
    print('error')

