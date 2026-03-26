# Service-Jundt

Copy `.env.example` to `.env` and add API keys.

```bash
cp .env.example .env
```

## Build

The docker image is built using the provided Dockerfile.

```bash
docker build -t service-jundt .
```

It uses node:24-alpine as base image. In a first step the dependencies are installed and in a second step the application is built. Finally the production image is created.

## Run

```bash
docker run -d -p 3000:3000 service-jundt
```
The app uses the port 3000 by default. You can change this by setting the `PORT` environment variable.