# Rock Paper Scissors DApp

A decentralized application (DApp) that allows users to play Rock Paper Scissors on the blockchain. This project consists of a React frontend and a Solidity smart contract using a factory pattern.

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
   - Run on http://127.0.0.1:8545

3. Deploy the factory contract:
   ```bash
   bun run deploy
   ```
   Save the factory contract address that gets displayed.

4. Configure MetaMask:
   - Open MetaMask
   - Click on the network dropdown
   - Select "Add Network"
   - Enter:
     - Network Name: Hardhat
     - RPC URL: http://127.0.0.1:8545
     - Chain ID: 1337
     - Currency Symbol: ETH
   - Click "Save"

5. Import a test account:
   - Copy a private key from the Hardhat node output
   - In MetaMask, click the account icon
   - Select "Import Account"
   - Paste the private key
   - Click "Import"

6. Update the factory contract address in the app:
   - Open `src/FactoryApp.js`
   - Update the `factoryAddress` constant with the address from step 3

7. Start the web app:
   ```bash
   bun run start
   ```
   The application will be available at `http://localhost:3000`

## Architecture

The application uses a factory pattern:
- `RockPaperScissorsFactory`: Creates individual game contracts
- Each player can create their own game contract and become its owner
- Players can join any existing game by providing the game ID

This approach solves ownership permissions and scales better than a single-contract approach.

## Features

### Account Change Detection
The application automatically detects when a user changes their MetaMask account or disconnects their wallet:
- Updates the UI to reflect the current connected account
- Reinitializes web3 connections when accounts change
- Handles wallet disconnection gracefully

For more details on how this works, see [Account Change Detection Documentation](docs/AccountChangeDetection.md).

## Troubleshooting

### MetaMask Connection Issues
- Make sure you're connected to the Hardhat network (Chain ID: 1337)
- Check the browser console for connection details
- Ensure the Hardhat node is running at http://127.0.0.1:8545

### Contract Interaction Failures
- Verify the factory contract address in the FactoryApp.js file
- Check if you have enough test ETH in your account
- Ensure the Hardhat node is running

## Project Structure

```
rock-paper-scissors/
├── contracts/              # Smart contract source files
│   ├── RockPaperScissors.sol        # Game logic contract
│   └── RockPaperScissorsFactory.sol # Factory contract
├── scripts/                # Deployment scripts
│   └── deployFactory.js    # Factory deployment script
├── src/                    # React application source
│   ├── App.js              # Main application component
│   ├── FactoryApp.js       # Factory pattern implementation
│   └── contracts/          # Contract ABIs
└── package.json            # Project dependencies and scripts
```

## Smart Contract Interaction

The application uses the following contract functions:

- `