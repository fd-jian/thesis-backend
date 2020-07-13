#!/bin/sh

ERR='Error: Missing $PARAM parameter'

[ -z "$CONNECT_HOST" ] && CONNECT_HOST="$1" && [ -z "$CONNECT_HOST" ] \
    && { echo $ERR | PARAM="host" envsubst; exit 1; }

[ -z "$CONNECT_PORT" ] && CONNECT_PORT="$2" && [ -z "$CONNECT_PORT" ] \
    && { echo $ERR | PARAM="port" envsubst; exit 1; }

echo "Waiting for rest endpoint at $CONNECT_HOST:$CONNECT_PORT"
until RE="$(curl -sf -m 1 \
    "http://$CONNECT_HOST:$CONNECT_PORT/connectors")"; do
    printf "."
    sleep 2
done
echo

find /data/connectors ! -path /data/connectors \
        -prune -type f -name "*.json"\
    | while read JSON_CONFIG; do
        
        CONNECT_NAME="$(jq -r '.name' "$JSON_CONFIG")"
        [ "$(jq -r '.config."connector.class"' "$JSON_CONFIG")" \
            = "com.evokly.kafka.connect.mqtt.MqttSourceConnector" ] \
            && [ "$(jq -r '.config."processing.message_processor"' \
                    "$JSON_CONFIG")" \
            = "com.evokly.kafka.connect.mqtt.sample.AvroProcessor" ] \
            && IS_MQTT_AVRO=1

        test -z "$IS_MQTT_AVRO" \
            || {
                REGISTRY_URL="$CONNECT_VALUE_CONVERTER_SCHEMA_REGISTRY_URL"

                [ -z "$REGISTRY_URL" ] && REGISTRY_URL="$3" \
                    && [ -z "$REGISTRY_URL" ] \
                    && { echo $ERR | PARAM="host" envsubst; exit 1; }

                echo "Waiting for rest endpoint at $REGISTRY_URL"
                SUBJECTS_URL="$REGISTRY_URL/subjects"
                until curl -sf -m 1 $SUBJECTS_URL > /dev/null; do
                    printf "."
                    sleep 2
                done
                echo

                KAFKA_TOPIC="$(jq -r 'if .config | has("kafka.topic") then .config."kafka.topic" elif .config | has("processing.kafka_schema_subject") then .config."processing.kafka_schema_subject" else "" end' "$JSON_CONFIG" | sed 's/^\(.\)/-\1/g')"
                FILENAME_TEMPL="/data/auto-schemas/\$T\$FILE.avsc"
                for TYPE in key value; do

                    [ "$TYPE" = "value" ] && export T='values/' 

                    SCHEMA_FILE="$(echo $FILENAME_TEMPL \
                        | FILE="$CONNECT_NAME-$TYPE"  envsubst)"
                    SCHEMA_FILE="$(test -f "$SCHEMA_FILE" \
                        && echo $SCHEMA_FILE \
                        || echo $(echo $FILENAME_TEMPL \
                        | FILE="$(basename "$JSON_CONFIG-$TYPE")" envsubst))"

                    test -f "$SCHEMA_FILE" \
                        || {
                            echo "No schema file found for '$CONNECT_NAME' and type '$TYPE'. Ignoring"
                            [ "$TYPE" = "value" ] && VAL_ERR=1
                            continue
                        }
                    
                    SUBJECT_NAME="mqtt$KAFKA_TOPIC-$TYPE"

                    # TODO: only delete and repush schema on startup in development
                    echo "Deleting old schema."
                    curl -sfSX DELETE \
                        "$SUBJECTS_URL/$SUBJECT_NAME" > /dev/null \
                        && echo "Deleted old schema successfully."

                    echo "Pushing schema to registry." \
                        && curl -fSX POST \
                            -H "Content-Type: application/vnd.schemaregistry.v1+json" \
                            --data "{\"schema\":$(jq --compact-output '' \
                                "$SCHEMA_FILE" | jq --raw-input '')}" \
                            "$SUBJECTS_URL/$SUBJECT_NAME/versions" > /dev/null \
                        && printf "\nPushed subject '$SUBJECT_NAME' to registry succesfully.\n" \
                        || {
                            echo "Error pushing schema to registry."
                            [ "$TYPE" = "value" ] && VAL_ERR=1
                        }

                    done
                }

            test -z "$VAL_ERR" || continue

            echo "$RE" | jq -e "index(\"$CONNECT_NAME\") and true or false" \
                    > /dev/null \
                && {
                    echo "Connector '$CONNECT_NAME' is already running. deleting (restart)."
                    curl -sfSX DELETE \
                        "http://$CONNECT_HOST:$CONNECT_PORT/connectors/$CONNECT_NAME" \
                    && printf "\nDeleted connector '$CONNECT_NAME' succesfully.\n" \
                    || echo "Error deleting connector '$CONNECT_NAME'"
                }

            echo " Creating connector '$CONNECT_NAME' via REST API." &&
                curl -sfSX POST \
                -H "Content-Type: application/json" \
                --data-binary "@$JSON_CONFIG" \
                "http://$CONNECT_HOST:$CONNECT_PORT/connectors" &&
                printf "\nCreated Connector '$CONNECT_NAME' succesfully.\n" ||
                echo "Error creating connector '$CONNECT_NAME'"

    done



