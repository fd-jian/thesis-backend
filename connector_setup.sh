#!/bin/sh

## Setup a single connector. Must be called with file path to connector JSON
## config. An .env file will be created in the same directory as the connector
## JSON config file, containing the user provided input. It will later be used
## by the `connector-creator` container to augment JSON config file when creating
## the respective connectors via the Kafka Connect REST API.
##
## Usage: setup_connector.sh [CONFIG_PATH]

echo "Setup connector at '"$1"'."

ENV_PATH="${1%%json}env"

./check_overwrite.sh "$ENV_PATH" || 
    exit 1

printf "Enter MQTT broker url: "
read -r MQTT_URL

printf "Enter MQTT broker user: "
read -r MQTT_USER

printf "Enter MQTT broker password: "
read -rs MQTT_PW
echo

cat > "$ENV_PATH" <<-EOM
MQTT_SERVER_URL=$MQTT_URL
MQTT_SERVER_USERNAME=$MQTT_USER
MQTT_SERVER_PASSWORD=$MQTT_PW
EOM

echo "Env file written to '$ENV_PATH'."
