# Rock Paper Scissors DApp

A decentralized application (DApp) that allows users to play Rock Paper Scissors on the blockchain. This project consists of a React frontend and a Solidity smart contract.

## Prerequisites

- Bun (JavaScript runtime & package manager)
- MetaMask or any Web3 wallet

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start the Hardhat network:
   ```bash
   bun run node
   ```
   This will:
   - Start a local Ethereum network
   - Create 20 test accounts with 10000 ETH each
   - Display the accounts and their private keys
   - Run on http://localhost:8545

3. Deploy the contract (in a new terminal):
   ```bash
   bun run deploy
   ```
   Save the contract address that gets displayed.

4. Configure MetaMask:
   - Open MetaMask
   - Click on the network dropdown
   - Select "Add Network"
   - Enter:
     - Network Name: Hardhat
     - RPC URL: http://localhost:8545
     - Chain ID: 1337
     - Currency Symbol: ETH
   - Click "Save"

5. Import a test account:
   - Copy a private key from the Hardhat node output
   - In MetaMask, click the account icon
   - Select "Import Account"
   - Paste the private key
   - Click "Import"

6. Start the web app (in a new terminal):
   ```bash
   bun run start
   ```
   The application will be available at `http://localhost:3000`

## Development

The project uses:
- Bun for package management and running scripts
- Hardhat for smart contract development
- React for the frontend

### Available Commands

- `bun run node` - Start the Hardhat network
- `bun run deploy` - Deploy the contract
- `bun run start` - Start the React development server

## Troubleshooting

1. **MetaMask Connection Issues**
   - Ensure MetaMask is connected to the Hardhat network
   - Check if you're using the correct chain ID (1337)
   - Make sure the Hardhat node is running

### Contract Interaction Failures
- Verify the contract address in your application
- Check if you have enough test ETH in your account
- Ensure the Hardhat node is running

## Project Structure

```
rock-paper-scissors/
├── contracts/           # Smart contract source files
├── public/             # Static files
├── src/               # React application source
└── package.json       # Project dependencies and scripts
```

## Smart Contract Interaction

The application uses the following contract functions:

- `