metamask-offering-collector
===========================

A proof-of-concept web application that allows accepting ETH for ministry and fundraising purposes via [MetaMask](https://metamask.io/).

# Setup

```
npm install
cp .env.example .env
```

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

