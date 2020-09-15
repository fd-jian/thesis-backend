#!/bin/env python3

import paho.mqtt.client as mqtt
import sys
import time
import os
from pathlib import Path

# Publish a constant stream of mock messages to a MQTT broker indefinitely.
# There is no timeout between publishing, so as much messages as possible are
# published. Multiple instances of this script may be started to yield a
# higher rate of published messages/second. Approx. 15000 messages/sec should
# be reached with one instance.
#
# TODO: Check if multithreading is possible within this script and handle a
#  thread number parameter.
#
# Usage:
# mqtt_pub_mock.py USER PW [BROKER_HOST] [USE_CACERT] [BROKER_PORT]
# Examples:
#   - mqtt_pub_mock.py username password
#   - mqtt_pub_mock.py username password localhost
#   - mqtt_pub_mock.py username password localhost 0
#   - mqtt_pub_mock.py username password localhost 1 8883


def on_connect(client, userdata, flags, rc):
    print(f'Connected to client {client} with result code {str(rc)}')


def on_disconnect(client, userdata, rc):
    print(f'Disconnected from client with code: {str(rc)}')


def on_publish(client, userdata, message):
    print(f'Message published to client {client}. ' +
          f'userdata: {userdata}, message: {message}')


def do_exit(code):
    try:
        sys.exit(code)
    except SystemExit:
        os._exit(code)


client = mqtt.Client()
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_publish = on_publish

arg_len = len(sys.argv)

if arg_len < 3:
    sys.stderr.write('Error: Username and password must be provided\n\n')
    sys.stderr.write('Usage: ' +
                     'mqtt_pub_mock.py USER PASSWORD [BROKER_HOST] ' +
                     '[USE_CUSTOM_CACERT] [BROKER_PORT]\n')
    do_exit(1)

client.username_pw_set(sys.argv[1], sys.argv[2])

if arg_len > 4 and not int(sys.argv[4]):
    client.tls_set()
else:
    script_dir = Path(__file__).resolve().parent.parent
    client.tls_set(ca_certs=f'{script_dir}/certs/default/ca.crt')

client.connect(
    arg_len > 3 and sys.argv[3] or "localhost",
    arg_len > 5 and int(sys.argv[5]) or 8883)
try:
    while True:
        ts = str(round(time.time() * 1000))
        client.publish(
            'sensors/linear_acceleration/12345',
            f'''{{
                    "time": {ts},
                    "sessionId": "testtest",
                    "values": [0.0,0.0,1.0]
                }}''')
        client.loop()
        # time.sleep(0.1)
except KeyboardInterrupt:
    print('KeyboardInterrupt')
    do_exit(0)
