#!/bin/sh

## Setup necessary dynamic URLs and login data that is not included in git
## repos. 
## 
## All necessary configuration can also be provided manually by creating
## the following .env files by hand: 
##  - ./.env (typical docker-compose environment file)
##  - ./kafka/connect-mqtt/connectors/[CONNECTOR].env (per-connector .env files)
##
## Each [CONNECTOR].env file mus provide the following environments:
##  - MQTT_SERVER_USERNAME
##  - MQTT_SERVER_PASSWORD
##  - INDICATOR_SERVICE_USERNAME
##  - INDICATOR_SERVICE_BCRYPT_PW
## 
## The CONNECTOR part of the filename can either be [CONNECTOR_NAME] or
## [CONNECTOR_CONFIG_FILE_BASENAME]. CONNECTOR_NAME is the name provided in
## the JSON config file of the connector. CONNECTOR_CONFIG_FILE_BASENAME is the
## basename of the JSON config file of the connector. For a config files named
## `sensors.json`, the basename is `sensors`. This script will use
## CONNECTOR_CONFIG_FILE_BASENAME.
##
## This is a convenience script, especially helpful to setup dynamic
## configuration of the MQTT Kafka connectors which are configured via JSON
## config files and can therefore not be configured through regular environment
## variables.
## 
## Usage: ./setup.sh

scripts/lib/env_setup.sh

find kafka/connect-mqtt/connectors -type f -name "*.json" -exec scripts/lib/connector_setup.sh {} \;

CONFIRM=
while [ -z "$CONFIRM" ]; do
    echo "Do you want to load the grafana init dump? [y/n]"
    read -r ANSW
    if echo "$ANSW" | grep -q -e "^y$" -e "^yes$"; then 
        CONFIRM=1
        echo "Loading grafana init dump..."
        scripts/restore_grafana.sh grafana/0graf_init_data.tar.gz
    elif echo "$ANSW" | grep -q -e "^n$" -e "^no$"; then 
        CONFIRM=0
        echo "Not loading grafana init dump. Skipping"
    fi
done
