#!/bin/sh

curl -sfS http://${3:-'localhost:8081'}/subjects/$1/versions/${2:-'1'} \
    | jq --raw-output '.schema' | jq
