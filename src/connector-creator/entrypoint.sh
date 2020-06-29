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

find /data/connectors ! -path /data/connectors -prune -type f -name "*.json" |
    while read JSON_CONFIG; do

        CONNECT_NAME="$(jq -r '.name' "$JSON_CONFIG")"
        IS_MQTT_AVRO="$(jq -r '.config."connector.class"' "$JSON_CONFIG" |
            grep -q "com.evokly.kafka.connect.mqtt.MqttSourceConnector" &&
            jq -r '.config."processing.message_processor"' "$JSON_CONFIG" |
            grep -q "com.evokly.kafka.connect.mqtt.sample.AvroProcessor" &&
            echo 1 || echo '')"

        test -z "$IS_MQTT_AVRO" ||
            {
                REGISTRY_URL="$CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL"
                [ -z "$REGISTRY_URL" ] && REGISTRY_URL="$3" &&
                    [ -z "$REGISTRY_URL" ] &&
                    { echo $ERR | PARAM="host" envsubst; exit 1; }

                echo "Waiting for rest endpoint at $REGISTRY_URL"
                SUBJECTS_URL="$REGISTRY_URL/subjects"
                echo $SUBJECTS_URL
                until curl -sf -m 1 $SUBJECTS_URL > /dev/null; do
                    printf "."
                    sleep 2
                done
                echo

                KAFKA_TOPIC="$(jq -r '.config."kafka.topic"' "$JSON_CONFIG")"

                FILENAME_TEMPL="/data/avro/\$T\$FILE.avsc"
                for TYPE in key value; do

                    SUBJECT_NAME="mqtt-$KAFKA_TOPIC-$TYPE"
                    curl -sf "$SUBJECTS_URL/$SUBJECT_NAME/versions" > /dev/null &&
                        echo "Subject '$SUBJECT_NAME' already exists." &&
                        continue

                    export T="$([ "$TYPE" = "value" ] && echo 'values/' || echo '')"
                    SCHEMA_FILE="$(echo $FILENAME_TEMPL | FILE="$CONNECT_NAME"  envsubst)"
                    SCHEMA_FILE="$(test -f \
                        "$SCHEMA_FILE" &&
                        echo $SCHEMA_FILE ||
                        echo $(echo $FILENAME_TEMPL | FILE="$(basename "$JSON_CONFIG")" envsubst))"
                    SCHEMA_FILE="$(test -f \
                        "$SCHEMA_FILE" &&
                        echo $SCHEMA_FILE ||
                        echo $(echo $FILENAME_TEMPL | FILE="$KAFKA_TOPIC" envsubst))"

                    test -f "$SCHEMA_FILE" ||
                        {
                            echo "No schema file found for '$KAFKA_TOPIC' and type '$TYPE'. Ignoring"
                            [ "$TYPE" = "value" ] && VAL_ERR=1
                            continue
                        }

                    echo "Pushing schema to registry." &&
                    curl -sfSX POST \
                        -H "Content-Type: application/vnd.schemaregistry.v1+json" \
                        --data "{\"schema\":$(jq --compact-output '' "$SCHEMA_FILE" | jq --raw-input '')}" \
                        "$SUBJECTS_URL/$SUBJECT_NAME/versions" > /dev/null &&
                        printf "\nSuccesfully pushed subject '$SUBJECT_NAME' to registry.\n" ||
                        {
                            echo "Error pushing schema to registry."
                            [ "$TYPE" = "value" ] && VAL_ERR=1
                        }

                    done
                }

            test -z "$VAL_ERR" || continue

            ! echo "$RE" | jq -e "index(\"$CONNECT_NAME\") and true or false" > /dev/null && {
                echo "Connector '$CONNECT_NAME' not running." &&
                {
                    echo " Creating connector '$CONNECT_NAME' via REST API." &&
                        curl -sfSX POST \
                        -H "Content-Type: application/json" \
                        --data-binary "@$JSON_CONFIG" \
                        "http://$CONNECT_HOST:$CONNECT_PORT/connectors" &&
                        printf "\nSuccesfully created Connector '$CONNECT_NAME'.\n" ||
                        echo "Error creating connector '$CONNECT_NAME'" ;
                    }

            } || echo "Connector '$CONNECT_NAME' is already running"
    done



