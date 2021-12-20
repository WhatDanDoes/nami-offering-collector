nami-offering-collector
=======================

A proof-of-concept web application that allows accepting ADA for ministry and fundraising purposes via [Nami](https://namiwallet.io/) wallet.

# Setup

```
npm install
cp .env.example .env
```

## Rust dependencies

This project depends on [Emurgo/message-signing](https://github.com/Emurgo/message-signing), which is written in [Rust](https://www.rust-lang.org/tools/install).

```
git clone git@github.com:Emurgo/message-signing.git
cd message-signing
npm run rust:build-nodejs
```

The app looks in the `message-signing/rust/` directory for the required module.

# Testing

Start a MongoDB development server:

```
docker run --name dev-mongo -p 27017:27017 -d mongo
```

Local Cardano environment node:

```
NETWORK=testnet docker-compose -f docker-compose.test.yml up

#docker run -v /data -e NETWORK=localhost inputoutput/cardano-node
```

## `spec/`

These are the Jasmine/Puppeteer tests, which perform some basic behavioural tests for when Nami is not installed or disabled. It also performs database unit tests.

```
npm test
```

These tests load the app internally, so the server must not be running when these tests are executed.

# Development

Run app with `nodemon`:

```
npm run test-server
```

# Production

In the application directory:

```
cd nami-offering-collector
cp .env.example .env # <- don't forget to configure
npm install --production
```

Don't forget the _Rust dependencies_ described above...

The _Dockerized_ production is meant to be deployed behind an `nginx-proxy`/`lets-encrypt` combo. Change the _Let's Encrypt_ fields as appropriate and execute:

```
docker-compose -f docker-compose.prod.yml up -d
```


