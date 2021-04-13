# Vouch DB

This service stores vouches as part of the gasless vouching mechanism.
Bootstrapped with Sidhant Panda's awesome [starter](https://github.com/sidhantpanda/docker-express-typescript-boilerplate).

## Getting Started

### Clone this repo

```
$ git clone git@github.com:Proof-Of-Humanity/vouch-db.git
$ cd vouch-db
```

### Install dependencies

```
$ npm i
```

### Development

#### Start dev server
Starting the dev server also starts MongoDB as a service in a docker container using the compose script at `docker-compose.dev.yml`.

```
$ npm run dev
```
Running the above commands results in
* 🌏**API Server** running at `http://localhost:3000`
* ⚙️**Swagger UI** at `http://localhost:3000/dev/api-docs`
* 🛢️**MongoDB** running at `mongodb://localhost:27017`

#### Build and run without Docker

```
$ npm run build && npm run start
```

#### Run with docker

```
$ docker build -t api-server .
$ docker run -t -i \
      --env NODE_ENV=production \
      --env MONGO_URL=mongodb://host.docker.internal:27017/vouches \
      -p 3000:3000 \
      api-server
```

#### Run with docker-compose

```
$ docker-compose up
```

#### Environment
To edit environment variables, create a file with name `.env` and copy the contents from `.env.default` to start with.

| Var Name  | Type  | Default | Description  |
|---|---|---|---|
| NODE_ENV  | string  | `development` |API runtime environment. eg: `staging`  |
|  PORT | number  | `3000` | Port to run the API server on |
|  MONGO_URL | string  | `mongodb://localhost:27017/vouches` | URL for MongoDB |

#### Logging
The application uses [winston](https://github.com/winstonjs/winston) as the default logger. The configuration file is at `src/logger.ts`.
* All logs are saved in `./logs` directory and at `/logs` in the docker container.
* The `docker-compose` file has a volume attached to container to expose host directory to the container for writing logs.
* Console messages are prettified
* Each line in error log file is a stringified JSON.