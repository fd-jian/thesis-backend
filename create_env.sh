#!/bin/sh

## Create .env file out .main.env and all *.env files from kafka mqtt connectors.
## This prevents configuring the same properties that are needed for the
## connector JSON config files again in the .env file. All environment variables
## that are not set in the *.env files in kafka/connect-mqtt/connectors should be
## kept in the .main.env file.

MAIN_ENV=.main.env
test -f $MAIN_ENV || { 
    echo "File '.main.env' is missing. Create it first. If an .env file exists, rename it to '.main.env'." >&2
    exit 1 
}

ENVS=$(find kafka/connect-mqtt/connectors -name "*.env")

[ $(echo "$ENVS" | wc -l) -eq 0 ] && { 
    [ "$1" -ne 1 ] && { 
        echo "No connector env files found. Use '1' as argument to force .env creation anyway." >&2
        exit 1
    } || {
        cp .env .env~
        cp .main.env .env
    }
}

cp .env .env~
cat .main.env $(printf "$ENVS") > .env
