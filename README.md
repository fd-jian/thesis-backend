# Engagement Detection System

System to detect students' engagement built with kafka and spring boot

## Structure

Image sources are added as git submodules, but images will be pushed to a docker repository at some point. 
The idea is to be able to 
  a) run the project with images from the repos with no build necessary.
  b) make changes to images and rebuild within this very project.

## Usage

### Build locally

For the initial launch, it is enough to run:

```
docker-compose up -d
```
Non-existent images will be built automatically.  

After the images have been built once, explicit rebuild is required to apply changes to image sources:

```
docker-compose up -d --build
```

Rebuilding all images may be time consuming. It may be desirable to only rebuild specific images:

```
docker-compose build [SERVICE...] && docker-compose up -d
```
or 

```
docker-compose up -d --build [SERVICE...]
```
Note, however, that the second command will also cause that *only* the mentioned service will be *recreated*.
This means that if you run a `docker pull` for another `SERVICE` earlier, the newer image will be ignored. 
This command will **not** leave you with all containers running on the most recent images you have locally.
It should only -- if ever -- be used as a convenience command to quickly rebuild a certain container during 
development.

### (TODO) Use latest repo images

Once the images are maintained in a docker repos, local builds are only necessary for development, 
after changes to the image sources. To run without building images locally but with the latest repository images:

```
docker-compose pull && docker-compose up -d
```
