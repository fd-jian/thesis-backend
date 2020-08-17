# Engagement Detection System

System to detect students' engagement built with kafka and spring boot.

## Structure

Image sources are added as git submodules, but images will be pushed to a docker repository at some point.
The idea is to be able to 
  a) run the project with images from the repos with no build necessary.
  b) make changes to images and rebuild within this very project.

## Usage

### GIT Checkout

There are three independent Git repositories integrated into this project. Those are called git submodules. In order to pull these repositories you need to use these commands:

```bash
git clone /url/to/repo/with/submodules
git submodule init
git submodule update
```
https://www.atlassian.com/git/tutorials/git-submodule

In order to have a submodule summary when executing “git status”, execute the “git config” command and add the “status.submoduleSummary” option.

```bash
$ git config --global status.submoduleSummary true
```

### Running Locally

For the initial launch, it is enough to run:

```
docker-compose up -d
```
Non-existent images will be built automatically.  

After the images have been built once, explicit rebuild is required to apply
changes to image sources:

```
docker-compose up -d --build
```

Rebuilding all images may be time consuming. It may be desirable to only
rebuild specific images:

```
docker-compose build [SERVICE...] && docker-compose up -d
```
or 

```
docker-compose up -d --build [SERVICE...]
```
Note, however, that the second command will also cause that *only* the
mentioned service will be *recreated*.
This means that if you run a `docker pull` for another `SERVICE` earlier, the
newer image will be ignored. 
This command will **not** leave you with all containers running on the most
recent images you have locally.
It should only -- if ever -- be used as a convenience command to quickly
rebuild a certain container during development.

### Running on Production Server

The docker-compose file is using environmental variables to configure the docker containers. Each variable has a default value used to run the project locally. In case you would like to run the project on your server you need to provide docker-compose with other variable values. One option is to modify the values in the file 'production.env' and rename it to .env on the server. Other option are listed here: https://docs.docker.com/compose/environment-variables/

### (TODO) Use latest repo images

Once the images are maintained in a docker repos, local builds are only
necessary for development, 
after changes to the image sources. To run without building images locally but
with the latest repository images:

```
docker-compose pull && docker-compose up -d
```

## Container interaction

This project provides various docker containers. Some of them are running
services, others are helper containers to bring up the infrastructure. 
The services can be further divided into custom, self-maintained services and
pre-built, third-party services, such as kafka or mosquitto.

### Services
#### Custom
- activity-detector
  - Consumes activities from the `linear_acceleration` topic to detect hand activities. This service is work in progress and does currently not detect anything, but rather aggregates messages, creates statistics, such as messages per second, and produces them to the `activities` topic. 
- indicator-service
  - Provides a stompjs endpoint for `indicator-ui` to retrieve data from kafka-topics in real-time. Currently it consumes from the topics `linear_acceleration` and `activities` and provides a stompjs topic for each kafka-topic.
- indicator-ui
  - Visualizes data from kafka topics into graphs by consuming provided stompjs topics of `indicator-service`.

#### Third party
- kafka
- kafka-connect
  - Executes the configured kafka connectors. Currently the only use case is connecting the `mosquitto` mqtt broker to the kafka data pipeline.
- schema-registry
  - Provides the necessary schemas to use apache avro in the kafka data pipeline. In addition to the usual automatic use with kafka producers and consumers, in this project it also manages the avro schemas that are necessary to convert mqtt messages to kafka avro messages. For more details see `kafka-connect-mqtt-lib`. 
- zookeeper
- mosquitto
- mqtt-client (dev only)
- proxy

### Helpers
- kafka-connect-mqtt-lib
  - Library for a custom mqtt connector. If `AvroProcessor` is used, the connector will query the `schema-registry` for a subject with the pattern `mqtt-<connector-name>-value` to deserialize avro data from mqtt messages. `connector-creator` configures this further.
- connector-creator
  - Creates kafka-connectors on docker-compose startup by using the provides configuration files. If `AvroProcessor` is used in a configuration, it searches for a corresponding avro schema in the configuration location and pushes it to the `schema-registry` before automatically creating the connectors via the kafka-connect REST-API.

