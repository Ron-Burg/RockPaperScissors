import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RockPaperScissorsFactory from './contracts/RockPaperScissorsFactory.json';
import RockPaperScissors from './contracts/RockPaperScissors.json';

function FactoryApp() {
  const [factoryContract, setFactoryContract] = useState(null);
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameContract, setGameContract] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [betAmount, setBetAmount] = useState('');

  useEffect(() => {
    initWeb3();

    // Add event listeners for account and chain changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    // Cleanup function to remove event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => window.location.reload());
      }
    };
  }, []);

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      // User has disconnected their wallet
      setAccount('');
      setStatus('Please connect to MetaMask');
      setFactoryContract(null);
    } else {
      // User has switched accounts
      setAccount(accounts[0]);
      setStatus('Account changed. Reconnecting...');
      
      // Reinitialize web3 with the new account
      await initWeb3();
    }
  };

  const initWeb3 = async () => {
    // Factory contract address from 'bun run deploy'
    const factoryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Update this with your deployed address
    
    if (window.ethereum) {
      try {
        // Log the network ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log('Connected to chain ID:', chainId);
        
        // Check if connected to Hardhat network (should be 1337)
        if (chainId !== '0x539') { // 0x539 is hex for 1337
          setStatus('Warning: You are not connected to the Hardhat network. Please switch to Hardhat (Chain ID: 1337)');
          console.warn('Not connected to Hardhat network. Current chainId:', chainId);
        }
        
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Check if the provider can connect to the contract
        try {
          const code = await provider.getCode(factoryAddress);
          console.log('Contract code at address:', code.length > 2 ? 'Found code' : 'No code found');
          
          if (code.length <= 2) {
            console.error('No contract deployed at the address. Make sure the Hardhat node is running and the contract is deployed.');
            setStatus('ERROR: No contract found at specified address. Please check if you deployed the contract and are on the correct network.');
          }
        } catch (error) {
          console.error('Error checking contract code:', error);
        }
        
        const signer = await provider.getSigner();
        const account = await signer.getAddress();
        setAccount(account);

        const factory = new ethers.Contract(factoryAddress, RockPaperScissorsFactory.abi, signer);
        setFactoryContract(factory);
        
        try {
          await loadGames(factory, signer);
          setStatus('Connected to MetaMask');
        } catch (error) {
          console.error('Error loading games:', error);
          setStatus('Error loading games: ' + error.message);
        }
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        setStatus('Error connecting to MetaMask: ' + error.message);
      }
    } else {
      setStatus('Please install MetaMask to use this app');
    }
  };

  const loadGames = async (factory, signer) => {
    try {
      const gameAddresses = await factory.getGames();
      setGames(gameAddresses);
    } catch (error) {
      setStatus('Error loading games: ' + error.message);
    }
  };

  const createNewGame = async () => {
    try {
      setStatus('Creating new game contract...');
      const tx = await factoryContract.createGame();
      await tx.wait();
      setStatus('Game contract created successfully!');
      
      // Reload games
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      await loadGames(factoryContract, signer);
    } catch (error) {
      setStatus('Error creating game: ' + error.message);
    }
  };

  const selectGame = async (gameAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      try {
        // First check if the address has code
        const code = await provider.getCode(gameAddress);
        if (code.length <= 2) {
          setStatus(`Error: No contract code found at address ${gameAddress}`);
          return;
        }
      } catch (codeError) {
        console.error("Error checking contract code:", codeError);
        setStatus(`Error checking contract at ${gameAddress}: ${codeError.message}`);
        return;
      }
      
      // Create a contract instance
      const game = new ethers.Contract(gameAddress, RockPaperScissors.abi, signer);
      setGameContract(game);
      setSelectedGame(gameAddress);
      
      // Get game info to determine state
      try {
        // Log the ABI of the contract to debug
        console.log("Using RockPaperScissors ABI:", RockPaperScissors.abi);
        
        // Check if game info method exists on the contract
        if (!game.getGameInfo) {
          console.error("getGameInfo method not found on contract");
          setStatus(`Error: Game contract doesn't have getGameInfo method. ABI mismatch detected.`);
          return;
        }
        
        // Call the getGameInfo method without parameters (since we're using individual game contracts)
        const info = await game.getGameInfo();
        console.log("Game info raw:", info);
        
        // Properly store the returned info
        setGameInfo({
          exists: info[0],
          canJoin: info[1],
          _betAmount: info[2],
          _state: info[3]
        });
        
        if (info[0]) { // exists
          if (info[1]) { // canJoin
            setStatus(`Game selected: ${gameAddress} - Waiting for player to join`);
          } else if (info[3] === 2) { // Completed state
            setStatus(`Game selected: ${gameAddress} - Game is completed`);
          } else {
            setStatus(`Game selected: ${gameAddress} - Game in progress`);
          }
        } else {
          setStatus(`Game selected: ${gameAddress} - No game created yet`);
        }
      } catch (error) {
        console.error("Error getting game info:", error);
        setStatus(`Error getting game info: ${error.message}. Check browser console for details.`);
        
        // Try to determine if this is an ABI mismatch
        if (error.message.includes("call revert exception") || 
            error.message.includes("function selector was not recognized")) {
          console.error("This could be an ABI mismatch. Make sure you've redeployed contracts and updated ABIs.");
        }
      }
    } catch (error) {
      console.error("Error selecting game:", error);
      setStatus(`Error selecting game: ${error.message}`);
    }
  };

  const createGame = async (choice) => {
    try {
      if (!betAmount || betAmount === '') {
        setStatus('Please enter a bet amount');
        return;
      }
      const tx = await gameContract.createGame(choice, {
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();
      setStatus('Game created successfully!');
      
      // Refresh game info
      selectGame(selectedGame);
    } catch (error) {
      setStatus('Error creating game: ' + error.message);
    }
  };

  const joinGame = async (choice) => {
    try {
      if (!gameInfo) {
        setStatus('No game info available. Select a game first.');
        return;
      }
      
      if (!gameInfo.exists) {
        setStatus('No game exists to join');
        return;
      }
      
      if (!gameInfo.canJoin) {
        setStatus('Cannot join this game');
        return;
      }
      
      // Use the bet amount from the game info
      try {
        const tx = await gameContract.joinGame(choice, {
          value: gameInfo._betAmount
        });
        
        setStatus('Joining game... Transaction submitted');
        await tx.wait();
        setStatus('Joined game successfully!');
        
        // Refresh game info
        await selectGame(selectedGame);
      } catch (joinError) {
        console.error("Error joining game:", joinError);
        setStatus(`Error joining game: ${joinError.message}`);
      }
    } catch (error) {
      console.error("Error in join game function:", error);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Rock Paper Scissors Factory</h1>
      <p>Connected Account: {account}</p>
      <p>Status: {status}</p>

      <div style={{ marginBottom: '20px' }}>
        <h2>Game Contracts</h2>
        <button onClick={createNewGame}>Create New Game Contract</button>
        
        <h3>Available Game Contracts:</h3>
        {games.length === 0 ? (
          <p>No game contracts found</p>
        ) : (
          <ul>
            {games.map((gameAddress, index) => (
              <li key={index}>
                {gameAddress} 
                <button onClick={() => selectGame(gameAddress)}>Select</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedGame && (
        <div>
          <h2>Selected Game: {selectedGame}</h2>
          
          {gameInfo && !gameInfo.exists && (
            <div style={{ marginBottom: '20px' }}>
              <h3>Create Game</h3>
              <input
                type="text"
                placeholder="Bet Amount (ETH)"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                style={{ marginRight: '10px' }}
              />
              <button onClick={() => createGame(1)}>Rock</button>
              <button onClick={() => createGame(2)}>Paper</button>
              <button onClick={() => createGame(3)}>Scissors</button>
            </div>
          )}

          {gameInfo && gameInfo.exists && gameInfo.canJoin && (
            <div>
              <h3>Join Game</h3>
              <p>Bet Amount: {gameInfo._betAmount ? ethers.formatEther(gameInfo._betAmount) : '0'} ETH</p>
              <p>Select your move to join the game:</p>
              <button onClick={() => joinGame(1)}>Rock</button>
              <button onClick={() => joinGame(2)}>Paper</button>
              <button onClick={() => joinGame(3)}>Scissors</button>
            </div>
          )}
          
          {gameInfo && gameInfo.exists && !gameInfo.canJoin && (
            <div>
              <h3>Game Status</h3>
              <p>This game is already in progress or completed.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FactoryApp; 