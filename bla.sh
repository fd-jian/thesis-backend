#!/bin/sh

echo "this script is not meant to be executed" >&2
exit 1

for i in $(seq 1 5); do
    while true; do 
        pub -p 8883 -u user -P changeme --cafile /opt/certs/ca.crt -h mosquitto -t \
        "sensors/linear_acceleration/123412" -m \
        "{
            \"time\": 1234125123,
            \"sessionId\": \"testtest\",
            \"values\": [
                $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1),
                $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1),
                $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1)
            ]
        }"
        #sleep 0.005
    done &
done

# best method
for i in $(seq 1 40); do
    while true; do 
        pub -p 8883 -u user -P changeme --cafile /opt/certs/ca.crt -h mosquitto -t \
        "sensors/linear_acceleration/123412" -m \
        "{
            \"time\": 1234125123,
            \"sessionId\": \"testtest\",
            \"values\": [
               0.0,
               0.0,
               0.0
            ]
        }"
        #sleep 0.005
    done &
done

# best method
for i in $(seq 1 40); do while true; do pub -p 8883 -u user -P changeme --cafile /opt/certs/ca.crt -h mosquitto -t "sensors/linear_acceleration/123412" -m "{\"time\": 1234125123,\"sessionId\": \"testtest\",\"values\": [0.0,0.0,0.0] }"; done & done


while true; do 
    for j in $(seq 1 20); do
        for i in $(seq 1 10); do
            pub -p 8883 -u user -P changeme --cafile /opt/certs/ca.crt -h mosquitto -t \
                "sensors/linear_acceleration/123412" -m \
                "{
                    \"time\": 1234125123,
                    \"sessionId\": \"testtest\",
                    \"values\": [ $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1),
                        $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1),
                        $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1)
                    ]
                }"
            #sleep 0.005
        done &
    done
    wait
done

# works pretty well
while true; do 
    for j in $(seq 1 20); do
        {
            pub -p 8883 -u user -P changeme --cafile /opt/certs/ca.crt -h mosquitto -t \
                "sensors/linear_acceleration/123412" -m \
                "{
                    \"time\": 1234125123,
                    \"sessionId\": \"testtest\",
                    \"values\": [
                        $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1),
                        $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1),
                        $(seq 0 20 | awk '{print ($0 - 10)}' | shuf | head -n1)
                    ]
                }"
            #sleep 0.0005
        } &
    done
    wait
done
