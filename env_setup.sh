#!/bin/sh

## Setup the docker-compose .env file with user provided input. 
##
## Usage: env_setup.sh

TXT_IND_SERVICE=indicator-service
TXT_MQTT_BROKER="MQTT broker"
ENV_PATH=".env"

echo Setup docker-compose .env file

./check_overwrite.sh "$ENV_PATH" ||
    exit 1

printf "Enter $TXT_MQTT_BROKER admin user: "
read -r MQTT_USER

printf "Enter $TXT_MQTT_BROKER admin password: "
read -rs MQTT_PW
echo

printf "Enter $TXT_IND_SERVICE user: "
read -r INDI_USER

printf "Enter $TXT_IND_SERVICE password: "
read -rs INDI_PW
echo

# use bcrypt docker container to has pw, easiest platform independent bcrypt solution
# TODO: do not use bcrypt in indicator-service to allow providing pw in cleartext.
INDI_PW=$(docker run --rm epicsoft/bcrypt hash "changeme" 10)

cat > "$ENV_PATH" <<-EOM
MQTT_SERVER_USERNAME=$MQTT_USER
MQTT_SERVER_PASSWORD=$MQTT_PW
INDICATOR_SERVICE_USERNAME=$INDI_USER
INDICATOR_SERVICE_BCRYPT_PW='${INDI_PW}'
EOM

echo "Env file written to '$ENV_PATH'."
