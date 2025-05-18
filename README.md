# Rock Paper Scissors DApp

![Game Flow Diagram](/public/images/game-flow.png)

## How It Works

This DApp implements a secure commit-reveal scheme, which is crucial for fair blockchain games:

1. **Commit Phase**: When a player makes their move, they don't reveal their choice directly. Instead, they:
   - Choose their move (Rock, Paper, or Scissors)
   - Generate a random salt (secret value)
   - Create a commitment hash using their choice and salt
   - Submit only the hash to the blockchain

2. **Reveal Phase**: After both players have committed their moves:
   - Players reveal their original choice and salt
   - The smart contract verifies the commitment by hashing the revealed values
   - If the hash matches the original commitment, the move is valid
   - The winner is determined and funds are distributed accordingly

This mechanism ensures:
- **Fairness**: Players cannot change their moves after seeing their opponent's choice
- **Transparency**: All moves are verifiable on the blockchain
- **Trustlessness**: No need for a trusted third party to mediate the game
- **Security**: The salt prevents other players from guessing moves before they're revealed

## Prerequisites

- Bun
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
   This will:
   - Deploy the factory contract
   - Generate and save the contract ABIs
   - Automatically update the factory address in the frontend code

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

6. Start the web app:
   ```bash
   bun run start
   ```
   The application will be available at `http://localhost:3000`

## Troubleshooting

### MetaMask Connection Issues
- Make sure you're connected to the Hardhat network (Chain ID: 1337)
- Check the browser console for connection details
- Ensure the Hardhat node is running at http://127.0.0.1:8545

### Contract Interaction Failures
- Check if you have enough test ETH in your account
- Ensure the Hardhat node is running
- Try redeploying the contracts if you're having issues