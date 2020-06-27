#!/bin/sh

ERR='Error: Missing $PARAM parameter'

[ -z "$CONNECT_HOST" ] && CONNECT_HOST="$1" && 
    [ -z "$CONNECT_HOST" ] && { echo $ERR | PARAM="host" envsubst; exit 1; }

[ -z "$CONNECT_PORT" ] && CONNECT_PORT="$2" && 
    [ -z "$CONNECT_PORT" ] && { echo $ERR | PARAM="port" envsubst; exit 1; }

echo "Waiting for rest endpoint at $CONNECT_HOST:$CONNECT_PORT"

until RE="$(curl -sf -m 1 "http://$CONNECT_HOST:$CONNECT_PORT/connectors")"; do
    printf "."
    sleep 2
done
echo


find /data ! -path /data -prune -type f -name "*.json" | 
    while read JSON_CONFIG; do
        CONNECT_NAME="$(jq -r '.name' "$JSON_CONFIG")"

        ! echo "$RE" | jq -e "index(\"$CONNECT_NAME\") and true or false" > /dev/null && {
            echo "Connector '$CONNECT_NAME' not running. Creating it via REST API." &&
            curl -sSX POST \
            -H "Content-Type: application/json" \
            --data-binary "@$JSON_CONFIG" \
            "http://$CONNECT_HOST:$CONNECT_PORT/connectors" &&
            printf "\nSuccesfully created Connector '$CONNECT_NAME'.\n" ||
            echo "Error creating connector '$CONNECT_NAME'" ;
        } ||
            echo "Connector '$CONNECT_NAME' is already running"
    done



