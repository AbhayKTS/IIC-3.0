# Almadox Smart Contracts

ERC-5192 Soulbound Token contracts for the Almadox campus identity platform, deployed on **Polygon Amoy Testnet**.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env and fill in:
# DEPLOYER_PRIVATE_KEY = your MetaMask wallet private key
# POLYGONSCAN_API_KEY  = from polygonscan.com/apis (free)
```

### 3. Get testnet POL for gas
Go to https://faucet.polygon.technology, select **Amoy**, paste your deployer wallet address.

### 4. Test locally first
```bash
npm test
```
All 8 tests should pass.

### 5. Deploy to Amoy
```bash
npm run deploy
```
This will print the deployed contract address and save it to `deployment.json`.

### 6. Verify on Polygonscan (optional)
```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```

### 7. Update the frontend
Copy the contract address from `deployment.json` and update `frontend/src/lib/web3.ts`.

---

## Contract

| Property | Value |
|---|---|
| Name | Almadox Soulbound Token |
| Symbol | ASBT |
| Standard | ERC-721 + ERC-5192 |
| Network | Polygon Amoy Testnet (Chain 80002) |
| Transferable | ❌ Never |

## Deployment Info
After deploying, a `deployment.json` file will be created here with the contract address, tx hash, and Polygonscan link.
