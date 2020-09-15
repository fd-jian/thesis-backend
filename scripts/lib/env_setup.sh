#!/bin/sh

## Setup the docker-compose .env file with user provided input. 
##
## Usage: env_setup.sh

TXT_IND_SERVICE=indicator-service
TXT_MQTT_BROKER="MQTT broker"
ENV_PATH=".env"

echo Setup docker-compose .env file

./scripts/lib/check_overwrite.sh "$ENV_PATH" ||
    exit 1

printf 'Enter %s admin user: ' "$TXT_MQTT_BROKER"
read -r MQTT_USER

printf 'Enter %s admin password: ' "$TXT_MQTT_BROKER"
# shellcheck disable=SC2039
read -rs MQTT_PW
echo

printf 'Enter %s user: ' "$TXT_IND_SERVICE"
read -r INDI_USER

printf 'Enter %s password: ' "$TXT_IND_SERVICE"
# shellcheck disable=SC2039
read -rs INDI_PW
echo

printf "Enter certificate directory: "
read -r CERTS_DIR
echo

# use bcrypt docker container to has pw, easiest platform independent bcrypt solution
# TODO: do not use bcrypt in indicator-service to allow providing pw in cleartext.
INDI_PW=$(docker run --rm epicsoft/bcrypt hash "changeme" 10)

cat > "$ENV_PATH" <<-EOM
MQTT_SERVER_USERNAME=$MQTT_USER
MQTT_SERVER_PASSWORD=$MQTT_PW
INDICATOR_SERVICE_USERNAME=$INDI_USER
INDICATOR_SERVICE_BCRYPT_PW='${INDI_PW}'
CERTS_DIR='${CERTS_DIR}'
EOM

echo "Env file written to '$ENV_PATH'."
