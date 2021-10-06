metamask-offering-collector
===========================

A proof-of-concept web application that allows accepting ETH for ministry and fundraising purposes via [MetaMask](https://metamask.io/).

# Setup

```
npm install
cp .env.example .env
```

# Testing

This app has a lot of moving parts, which are reflected in the tests themselves. There are two seperate test sets found in the `spec/` and `tests/` directorys. The former depend upon Jasmine and Puppeteer while the latter use [Synpress](https://github.com/Synthetixio/synpress), which is a rather brittle marriage between Cypress, Puppeteer, and Metamask. I hope to simplify and consolidate these tests as I further develop my personal blockchain development workflow.

For both test sets, start a MongoDB development server:

```
docker run --name dev-mongo -p 27017:27017 -d mongo
```

## `spec/`

These are the Jasmine/Puppeteer tests, which perform some basic behavioural tests for when Metamask is not installed or disabled. It also performs database unit tests.

```
npm test
```

These tests load the app internally, so the server must not be running when these tests are executed.

## `tests/`

These are the tests that include Metamask (I can't help but wonder if I should update [Dappeteer](https://github.com/decentraland/dappeteer) myself, because Synpress feels a bit clunky).

Start the local test chain:

```
npx ganache-cli
```

Run app with `nodemon`:

```
npm run test-server
```

Run Synpress. You can retrieve the `SECRET_WORDS` from the _HD Wallet Mnemonic_ produced by `ganache-cli`. The documentation recommends you use this:

```
NODE_ENV=test NETWORK_NAME=localhost SECRET_WORDS='twelve secret recovery words etc...' npx synpress run --configFile tests/e2e/customConfig.json
```

The following doesn't reset state properly sometimes (Synpress is _clunky_, remember. Also, the documentation doesn't always align with what actually works):

```
NODE_ENV=test NETWORK_NAME=localhost SECRET_WORDS='twelve secret recovery words etc...' npx synpress open --configFile tests/e2e/customConfig.json
```

## 2021-10-4

_Note until fixed:_

Though [synpress](https://github.com/Synthetixio/synpress) is a wonderful tool, it is still very much a work in progress. The CSS selectors that enable signature verification have changed somewhere in the last week, and so were manually modified in `node_modules/@synthetixio/synpress/pages/metamask/notification-page.js`.

# Production

In the application directory:

```
cd auth0-photo-server
cp .env.example .env # <- don't forget to configure
NODE_ENV=production npm install
```

The _Dockerized_ production is meant to be deployed behind an `nginx-proxy`/`lets-encrypt` combo. Change the _Let's Encrypt_ fields as appropriate and execute:

```
docker-compose -f docker-compose.prod.yml up -d
```


