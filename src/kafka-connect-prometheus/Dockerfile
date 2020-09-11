FROM confluentinc/cp-kafka-connect:latest

ADD prom-jmx-agent-config.yml /usr/app/prom-jmx-agent-config.yml
add logging.properties /usr/app/logging.properties
#ADD https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.9/jmx_prometheus_javaagent-0.9.jar /usr/app/jmx_prometheus_javaagent.jar
ADD https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/0.6/jmx_prometheus_javaagent-0.6.jar /usr/app/jmx_prometheus_javaagent.jar
