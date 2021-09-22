metamask-offering-collector
===========================

A proof-of-concept web application that allows accepting ETH for ministry and fundraising purposes via [MetaMask](https://metamask.io/).

# Setup

```
npm install
cp .env.example .env
```

The `.env` stuff won't work out of the box. You'll need an ETH address and a blockchain API access point at a minimum (I'm using [alchemy](https://www.alchemy.com/) for the moment). The var names should be self explanatory.

Run Ganache:

```
npx ganache-cli
```

Run app:

```
npm run test-server
```

Run Synpress:

```
NETWORK_NAME=localhost SECRET_WORDS='twelve secret recovery words etc...' npx synpress open
NETWORK_NAME=localhost SECRET_WORDS='twelve secret recovery words etc...' npx synpress run
```

