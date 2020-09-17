#!/bin/sh

## Setup the docker-compose .env file with user provided input. 
##
## Usage: env_setup.sh

. scripts/lib/read_s.sh

TXT_IND_SERVICE=indicator-service
TXT_MQTT_BROKER="MQTT broker"
ENV_PATH=".env"

echo Setup docker-compose .env file

./scripts/lib/check_overwrite.sh "$ENV_PATH" ||
    exit 1

printf 'Enter %s admin user: ' "$TXT_MQTT_BROKER"
read -r MQTT_USER

read_password "$(printf 'Enter %s password: ' "$TXT_MQTT_BROKER")"
MQTT_PW="$REPLY"
echo

MQTT_PW_FILE="mosquitto/passwd"
./scripts/lib/check_overwrite.sh "$MQTT_PW_FILE" && 
    docker run --rm -it -v "$PWD"/mosquitto:/data eclipse-mosquitto mosquitto_passwd -c -b /data/passwd "$MQTT_USER" "$MQTT_PW"

printf 'Enter %s user: ' "$TXT_IND_SERVICE"
read -r INDI_USER

read_password "$(printf 'Enter %s password: ' "$TXT_IND_SERVICE")"
INDI_PW="$REPLY"
echo

printf "Enter certificate directory: "
read -r CERTS_DIR
echo

# use bcrypt docker container to has pw, easiest platform independent bcrypt solution
# TODO: do not use bcrypt in indicator-service to allow providing pw in cleartext.
INDI_PW=$(docker run --rm epicsoft/bcrypt hash "$INDI_PW" 10)

cat > "$ENV_PATH" <<-EOM
MQTT_SERVER_USERNAME=$MQTT_USER
MQTT_SERVER_PASSWORD=$MQTT_PW
INDICATOR_SERVICE_USERNAME=$INDI_USER
INDICATOR_SERVICE_BCRYPT_PW='${INDI_PW}'
CERTS_DIR='${CERTS_DIR}'
EOM

echo "Env file written to '$ENV_PATH'."
