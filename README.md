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

Run Synpress. The documentation recommends you use this:

```
NETWORK_NAME=localhost SECRET_WORDS='twelve secret recovery words etc...' npx synpress run
```

The following doesn't reset state properly sometimes (Synpress is _clunky_, remember. Also, the documentation doesn't always align with what actually works):

```
NETWORK_NAME=localhost SECRET_WORDS='twelve secret recovery words etc...' npx synpress open
```


