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
  const [gameResult, setGameResult] = useState(null);
  const [gameOwner, setGameOwner] = useState(null);
  const [gamePlayer, setGamePlayer] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Reference to track current account for async operations
  const currentAccountRef = React.useRef('');
  
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

  // Update ref whenever account changes
  useEffect(() => {
    currentAccountRef.current = account;
    
    // When account changes, refresh selected game info if a game is selected
    if (selectedGame) {
      selectGame(selectedGame);
    }
  }, [account, selectedGame]);

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
      // Verify we're still using the correct account
      if (account !== currentAccountRef.current) {
        setStatus('Account changed. Please try again.');
        await initWeb3();
        return;
      }
      
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
      
      // Get the game owner and set it
      try {
        const owner = await game.owner();
        setGameOwner(owner);
        console.log("Game owner:", owner);
      } catch (error) {
        console.error("Error getting game owner:", error);
      }
      
      // Get the game player if available
      try {
        const player = await game.player();
        if (player && player !== ethers.ZeroAddress) {
          setGamePlayer(player);
          console.log("Game player:", player);
        } else {
          setGamePlayer(null);
        }
      } catch (error) {
        console.error("Error getting game player:", error);
      }
      
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
        
        // Always directly check if game is completed instead of relying on game info
        const gameCompleted = await game.isCompleted();
        const gameState = await game.state();
        console.log("Game state:", gameState, "Is completed:", gameCompleted);
        
        // Update the isCompleted state
        setIsCompleted(gameCompleted);
        
        // Get result if the game is completed
        if (gameCompleted) {
          try {
            const resultValue = await game.result();
            // Log the result value to understand its format
            console.log("Raw game result value:", resultValue, 
              "toString():", resultValue.toString(), 
              "toNumber():", resultValue.toNumber ? resultValue.toNumber() : "N/A");
            
            // Store the numeric value, not the BigNumber object
            setGameResult(Number(resultValue.toString()));
          } catch (resultError) {
            console.error("Error getting game result:", resultError);
          }
        }
        
        // Properly store the returned info, ensuring state is accurate
        setGameInfo({
          exists: info[0],
          canJoin: info[1],
          _betAmount: info[2],
          _state: gameState // Use the directly queried state
        });
        
        // Display proper game status based on state
        if (info[0]) { // exists
          // Force use isCompleted to determine actual completion state 
          if (gameCompleted || gameState === 2) { // Completed (double check to ensure accuracy)
            // Get the result object if game is completed
            let resultObj = null;
            
            if (gameResult !== null) {
              resultObj = gameResult;
              console.log("Using cached game result:", resultObj);
            } else {
              try {
                const rawResult = await game.result();
                // Convert BigNumber to a regular number
                resultObj = Number(rawResult.toString());
                console.log("Fetched new game result, raw:", rawResult, "converted:", resultObj);
                setGameResult(resultObj);
              } catch (resultError) {
                console.error("Error getting result:", resultError);
              }
            }
            
            console.log("Final result object used for UI:", resultObj);
            
            if (resultObj !== null) {
              // Translate numeric result to text
              let resultText, winnerAddress;
              
              // Match against numeric values
              if (resultObj === 0) {
                resultText = "Not determined";
                winnerAddress = null;
              } else if (resultObj === 1) {
                resultText = "Owner (Player 1) won";
                winnerAddress = gameOwner;
              } else if (resultObj === 2) {
                resultText = "Player (Player 2) won";
                winnerAddress = gamePlayer;
              } else if (resultObj === 3) { // Tie
                resultText = "Tie";
                winnerAddress = null;
              } else {
                resultText = `Unknown result (${resultObj})`;
                winnerAddress = null;
              }
              
              setStatus(`Game completed - ${resultText}${winnerAddress ? `. Winner: ${winnerAddress}` : ""}`);
            } else {
              setStatus(`Game selected: ${gameAddress} - Game is completed`);
            }
          } else if (info[1]) { // canJoin
            setStatus(`Game selected: ${gameAddress} - Waiting for player to join`);
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
      // Verify we're still using the correct account
      if (account !== currentAccountRef.current) {
        setStatus('Account changed. Please try again.');
        await initWeb3();
        return;
      }
      
      if (!betAmount || betAmount === '') {
        setStatus('Please enter a bet amount');
        return;
      }
      
      // Get a fresh contract instance with the current signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentGame = new ethers.Contract(selectedGame, RockPaperScissors.abi, signer);
      
      const tx = await currentGame.createGame(choice, {
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();
      setStatus('Game created successfully!');
      
      // Refresh game info
      await selectGame(selectedGame);
    } catch (error) {
      setStatus('Error creating game: ' + error.message);
    }
  };

  const joinGame = async (choice) => {
    try {
      // Verify we're still using the correct account
      if (account !== currentAccountRef.current) {
        setStatus('Account changed. Please try again.');
        await initWeb3();
        return;
      }
      
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
      
      // Get a fresh contract instance with the current signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const currentGame = new ethers.Contract(selectedGame, RockPaperScissors.abi, signer);
      
      // Use the bet amount from the game info
      try {
        const tx = await currentGame.joinGame(choice, {
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

  // Helper function to display the winner information
  const renderGameResult = () => {
    if (!gameResult && gameResult !== 0) {
      console.log("No game result available:", gameResult);
      return "Game result not available";
    }
    
    console.log("Rendering game result:", gameResult, "Type:", typeof gameResult);
    
    // Translate numeric result to text with player numbers
    let resultText;
    let winnerAddress;
    let winnerLabel;
    
    // Use strict numeric comparison since we convert BigNumber to Number
    if (gameResult === 1) { 
      resultText = "Owner (Player 1) won";
      winnerAddress = gameOwner;
      winnerLabel = "Player 1";
    } else if (gameResult === 2) {
      resultText = "Player (Player 2) won";
      winnerAddress = gamePlayer;
      winnerLabel = "Player 2";
    } else if (gameResult === 3) { // Tie
      resultText = "Tie - Both players get their bets back";
      winnerAddress = null;
      winnerLabel = "None";
    } else {
      resultText = `Unknown result (${gameResult})`;
      winnerAddress = null;
      winnerLabel = "Unknown";
    }
    
    const isCurrentUserWinner = winnerAddress && winnerAddress.toLowerCase() === account.toLowerCase();
    
    return (
      <div style={{ 
        marginTop: '10px', 
        padding: '15px', 
        backgroundColor: isCurrentUserWinner ? '#e6ffe6' : gameResult === 3 ? '#f5f5f5' : '#ffe6e6', 
        borderRadius: '5px',
        border: '1px solid ' + (isCurrentUserWinner ? '#b3e6b3' : gameResult === 3 ? '#dcdcdc' : '#ffb3b3')  
      }}>
        <h4>Game Result: {resultText}</h4>
        {winnerAddress && (
          <div>
            <p><strong>Winner: {winnerLabel}</strong> ({winnerAddress.substring(0, 6)}...{winnerAddress.substring(38)}) {isCurrentUserWinner ? "👑 YOU WON! 👑" : ""}</p>
            {isCurrentUserWinner && <p>The prize has been sent to your wallet!</p>}
          </div>
        )}
        {gameResult === 3 && (
          <p>Each player received their bet back.</p>
        )}
      </div>
    );
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
          
          {/* Show player info */}
          <div style={{ 
            marginBottom: '15px',
            padding: '10px',
            background: '#f8f9fa',
            borderRadius: '5px'
          }}>
            <h3>Players</h3>
            {gameOwner && (
              <p><strong>Player 1 (Owner):</strong> {gameOwner.substring(0, 6)}...{gameOwner.substring(38)} {gameOwner.toLowerCase() === account.toLowerCase() ? "👈 (You)" : ""}</p>
            )}
            {gamePlayer && gamePlayer !== ethers.ZeroAddress ? (
              <p><strong>Player 2:</strong> {gamePlayer.substring(0, 6)}...{gamePlayer.substring(38)} {gamePlayer.toLowerCase() === account.toLowerCase() ? "👈 (You)" : ""}</p>
            ) : (
              gameInfo && gameInfo.exists && gameInfo.canJoin && (
                <p><strong>Player 2:</strong> <i>Waiting for someone to join...</i></p>
              )
            )}
          </div>
          
          {/* Show game result when completed */}
          {gameInfo && (gameInfo._state === 2 || isCompleted) && renderGameResult()}
          
          {/* Create Game UI */}
          {gameInfo && !gameInfo.exists && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              background: '#e6f7ff',
              borderRadius: '5px',
              border: '1px solid #91d5ff'
            }}>
              <h3>Create Game</h3>
              <input
                type="text"
                placeholder="Bet Amount (ETH)"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                style={{ marginRight: '10px', padding: '5px' }}
              />
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => createGame(1)}
                  style={{ 
                    marginRight: '10px', 
                    padding: '8px 15px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  Rock
                </button>
                <button 
                  onClick={() => createGame(2)}
                  style={{ 
                    marginRight: '10px', 
                    padding: '8px 15px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  Paper
                </button>
                <button 
                  onClick={() => createGame(3)}
                  style={{ 
                    padding: '8px 15px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  Scissors
                </button>
              </div>
            </div>
          )}

          {/* Join Game UI */}
          {gameInfo && gameInfo.exists && gameInfo.canJoin && (
            <div style={{ 
              padding: '15px',
              background: '#f6ffed',
              borderRadius: '5px',
              border: '1px solid #b7eb8f'
            }}>
              <h3>Join Game</h3>
              <p>Bet Amount: <strong>{gameInfo._betAmount ? ethers.formatEther(gameInfo._betAmount) : '0'} ETH</strong></p>
              <p>Select your move to join the game:</p>
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => joinGame(1)}
                  style={{ 
                    marginRight: '10px', 
                    padding: '8px 15px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  Rock
                </button>
                <button 
                  onClick={() => joinGame(2)}
                  style={{ 
                    marginRight: '10px', 
                    padding: '8px 15px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  Paper
                </button>
                <button 
                  onClick={() => joinGame(3)}
                  style={{ 
                    padding: '8px 15px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  Scissors
                </button>
              </div>
            </div>
          )}
          
          {/* In Progress UI */}
          {gameInfo && gameInfo.exists && !gameInfo.canJoin && gameInfo._state === 1 && (
            <div style={{ 
              padding: '15px',
              background: '#fff7e6',
              borderRadius: '5px',
              border: '1px solid #ffd591'
            }}>
              <h3>Game Status: In Progress</h3>
              <p>The game is currently in progress. Waiting for completion...</p>
              <p>Once both players have made their moves, the game will complete automatically.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FactoryApp; 