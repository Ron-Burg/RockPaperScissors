import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RockPaperScissorsFactory from './contracts/RockPaperScissorsFactory.json';
import RockPaperScissors from './contracts/RockPaperScissors.json';

function FactoryApp() {
  const [factoryContract, setFactoryContract] = useState(null);
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [availableGames, setAvailableGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);
  const [showCompletedGames, setShowCompletedGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameContract, setGameContract] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [gameResult, setGameResult] = useState(null);
  const [gameOwner, setGameOwner] = useState(null);
  const [gamePlayer, setGamePlayer] = useState(null);
  const [ownerChoice, setOwnerChoice] = useState(null);
  const [ownerSalt, setOwnerSalt] = useState('');
  const [revealChoiceValue, setRevealChoiceValue] = useState(null);
  const [revealSalt, setRevealSalt] = useState('');
  const [playerChoice, setPlayerChoice] = useState(null);

  // Reference to track current account for async operations
  const currentAccountRef = React.useRef('');
  
  // Load saved game data when component mounts
  useEffect(() => {
    const savedGameData = localStorage.getItem('gameData');
    if (savedGameData) {
      try {
        const data = JSON.parse(savedGameData);
        if (data.ownerChoice) {
          setOwnerChoice(BigInt(data.ownerChoice));
        }
        if (data.ownerSalt) {
          setOwnerSalt(data.ownerSalt);
        }
        if (data.playerChoice) {
          setPlayerChoice(BigInt(data.playerChoice));
        }
        if (data.gameAddress) {
          selectGame(data.gameAddress);
        }
      } catch (error) {
        console.error('Error loading saved game data:', error);
        // Clear invalid data
        localStorage.removeItem('gameData');
      }
    }
  }, []);

  // Save game data whenever it changes
  useEffect(() => {
    try {
      const gameData = {
        ownerChoice: ownerChoice?.toString(),
        ownerSalt: ownerSalt,
        playerChoice: playerChoice?.toString(),
        gameAddress: selectedGame
      };
      localStorage.setItem('gameData', JSON.stringify(gameData));
    } catch (error) {
      console.error('Error saving game data:', error);
    }
  }, [ownerChoice, ownerSalt, playerChoice, selectedGame]);

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

  // Add new useEffect to load games when account changes
  useEffect(() => {
    const loadGamesForAccount = async () => {
      if (account && factoryContract) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          await loadGames(factoryContract, signer);
        } catch (error) {
          console.error('Error loading games:', error);
          setStatus('Error loading games: ' + error.message);
        }
      }
    };

    loadGamesForAccount();
  }, [account, factoryContract]);

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
      setAvailableGames([]);
      setCompletedGames([]);
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
        
        setStatus('Connected to MetaMask');
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
      
      // Separate games into completed and available
      const available = [];
      const completed = [];
      
      for (const address of gameAddresses) {
        const game = new ethers.Contract(address, RockPaperScissors.abi, signer);
        const [state, betAmount, owner, player] = await Promise.all([
          game.state(),
          game.betAmount(),
          game.owner(),
          game.player()
        ]);

        
        const gameState = Number(state);
        const isOwner = owner.toLowerCase() === account.toLowerCase();
        const isPlayer = player.toLowerCase() === account.toLowerCase();
        
        if (gameState === 3) { // Completed
          // Only add to completed if user was a participant
          if (isOwner || isPlayer) {
            completed.push(address);
          }
        } else {
          if (isOwner || // User is the game owner
              (!isOwner && gameState === 1) || // User is not owner, first move done so can join
              isPlayer) { // User is the player and has already joined
            available.push({
              address,
              isOwner,
              isPlayer,
              betAmount,
              state: gameState
            });
          }
        }
      }
      
      // console.log('available', available);
      // console.log('completed', completed);

      setAvailableGames(available);
      setCompletedGames(completed);
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
      const receipt = await tx.wait();
      
      // Get the new game address from the event
      const event = receipt.logs.find(log => log.fragment?.name === 'GameContractCreated');
      if (!event) {
        throw new Error('GameContractCreated event not found');
      }
      const gameAddress = event.args[0];
      
      setStatus('Game contract created! Select the game to make your move.');
      
      // Reload games
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      await loadGames(factoryContract, signer);
      
      // Automatically select the new game
      await selectGame(gameAddress);
    } catch (error) {
      setStatus('Error creating game: ' + error.message);
    }
  };

  const generateSalt = () => {
    return ethers.randomBytes(32);
  };

  const generateCommit = (choice, salt) => {
    // Convert salt string to bytes and pad to 32 bytes
    const saltBytes = ethers.toUtf8Bytes(salt);
    const paddedSalt = ethers.zeroPadValue(saltBytes, 32);
    // Match the contract's keccak256(abi.encodePacked(_choice, _salt))
    return ethers.keccak256(ethers.concat([
      ethers.toBeArray(choice),
      paddedSalt
    ]));
  };

  const makeFirstMove = async (choice) => {
    try {
      if (account !== currentAccountRef.current) {
        setStatus('Account changed. Please try again.');
        await initWeb3();
        return;
      }
      
      if (!betAmount || betAmount === '') {
        setStatus('Please enter a bet amount');
        return;
      }

      if (!ownerSalt) {
        setStatus('Please enter a salt');
        return;
      }
      
      if (!selectedGame) {
        setStatus('Please select a game first');
        return;
      }
      
      setStatus('Making your move...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const game = new ethers.Contract(selectedGame, RockPaperScissors.abi, signer);
      
      // Generate commit using the provided salt
      const commit = generateCommit(choice, ownerSalt);
      
      const tx = await game.startGame(commit, {
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();
      
      setStatus('Move committed successfully!');
      
      // Refresh game info
      await selectGame(selectedGame);
      
      // Also refresh the available games list
      await loadGames(factoryContract, signer);
    } catch (error) {
      setStatus('Error making move: ' + error.message);
    }
  };

  const selectGame = async (gameAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      try {
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
      
      const game = new ethers.Contract(gameAddress, RockPaperScissors.abi, signer);
      setGameContract(game);
      setSelectedGame(gameAddress);
      
      // Get game data directly
      const [state, betAmount, owner, player] = await Promise.all([
        game.state(),
        game.betAmount(),
        game.owner(),
        game.player()
      ]);
      
      const gameState = Number(state);
      const isOwner = owner.toLowerCase() === account.toLowerCase();
      
      setGameOwner(owner);
      setGamePlayer(player !== ethers.ZeroAddress ? player : null);
      setGameState(gameState);
      setBetAmount(betAmount.toString());
      
      // If this is the game we have saved data for, load it
      const savedGameData = localStorage.getItem('gameData');
      if (savedGameData) {
        const data = JSON.parse(savedGameData);
        if (data.gameAddress === gameAddress) {
          setOwnerChoice(data.ownerChoice ? BigInt(data.ownerChoice) : null);
          setOwnerSalt(data.ownerSalt);
        }
      }

      // Get player choices
      const [ownerChoice, playerChoice] = await Promise.all([
        game.ownerChoice(),
        game.playerChoice()
      ]);
      setOwnerChoice(ownerChoice);
      setPlayerChoice(playerChoice);
      
      // Get result if game is completed
      if (gameState === 3) { // Completed
        const result = await game.result();
        setGameResult(Number(result));
      }
      
      // Set status based on game state
      if (gameState === 0) { // Deployed
        if (isOwner) {
          setStatus(`Game selected: ${gameAddress} - Ready to make your move`);
        } else {
          setStatus(`Game selected: ${gameAddress} - Game is deployed, waiting for owner to make their move`);
        }
      } else if (gameState === 1) { // Committed
        if (isOwner) {
          setStatus(`Game selected: ${gameAddress} - Waiting for player to join`);
        } else {
          setStatus(`Game selected: ${gameAddress} - Ready to join the game`);
        }
      } else if (gameState === 2) { // WaitingForReveal
        setStatus(`Game selected: ${gameAddress} - Waiting for owner to reveal their choice`);
      } else if (gameState === 3) { // Completed
        let resultText;
        if (gameResult === 1) {
          resultText = "Owner (Player 1) won";
        } else if (gameResult === 2) {
          resultText = "Player (Player 2) won";
        } else if (gameResult === 3) {
          resultText = "Tie - Both players get their bets back";
        }
        setStatus(`Game completed - ${resultText}`);
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
      if (account !== currentAccountRef.current) {
        setStatus('Account changed. Please try again.');
        await initWeb3();
        return;
      }
      
      if (!selectedGame) {
        setStatus('No game selected');
        return;
      }
      
      if (gameState !== 1) {
        setStatus('Cannot join this game - it is not in the correct state');
        return;
      }
      
      setStatus('Joining game...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const game = new ethers.Contract(selectedGame, RockPaperScissors.abi, signer);
      
      // Get the bet amount from the contract
      const contractBetAmount = await game.betAmount();
      
      const tx = await game.joinGame(choice, {
        value: contractBetAmount
      });
      
      setStatus('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      setStatus('Successfully joined the game!');
      
      // Refresh game info
      await selectGame(selectedGame);
      
      // Also refresh the available games list
      await loadGames(factoryContract, signer);
    } catch (error) {
      console.error('Error joining game:', error);
      setStatus('Error joining game: ' + error.message);
    }
  };

  const revealChoice = async () => {
    try {
      if (!selectedGame) {
        setStatus('Please select a game first');
        return;
      }

      if (!revealChoiceValue || !revealSalt) {
        setStatus('Please enter both your choice and salt');
        return;
      }

      setStatus('Revealing your choice...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const game = new ethers.Contract(selectedGame, RockPaperScissors.abi, signer);

      // Convert salt to bytes and pad to 32 bytes
      const saltBytes = ethers.toUtf8Bytes(revealSalt);
      const paddedSalt = ethers.zeroPadValue(saltBytes, 32);

      const tx = await game.revealChoice(revealChoiceValue, paddedSalt);
      setStatus('Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      setStatus('Choice revealed successfully!');
      
      // Clear reveal inputs
      setRevealChoiceValue(null);
      setRevealSalt('');
      
      // Refresh game info
      await selectGame(selectedGame);
      
      // Also refresh the available games list
      await loadGames(factoryContract, signer);
    } catch (error) {
      console.error('Error revealing choice:', error);
      setStatus('Error revealing choice: ' + error.message);
    }
  };

  const refreshGames = async () => {
    if (factoryContract && account) {
      setStatus('Refreshing games...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      await loadGames(factoryContract, signer);
      setStatus('Games refreshed');
    }
  };

  // Helper function to display the winner information
  const renderGameResult = () => {
    if (gameResult === undefined || gameResult === null) {
      return (
        <div className="alert alert-info">
          Game result not available
        </div>
      );
    }
    
    let resultText;
    let winnerAddress;
    let winnerLabel;
    let resultColor;
    
    const getChoiceText = (choice) => {
      switch (Number(choice)) {
        case 1: return "✊ Rock";
        case 2: return "✋ Paper";
        case 3: return "✌️ Scissors";
        default: return "Unknown";
      }
    };
    
    switch (Number(gameResult)) {
      case 0:
        resultText = "Game not completed";
        winnerAddress = null;
        winnerLabel = "None";
        resultColor = "info";
        break;
      case 1:
        resultText = "Owner (Player 1) won";
        winnerAddress = gameOwner;
        winnerLabel = "Player 1";
        resultColor = "success";
        break;
      case 2:
        resultText = "Player (Player 2) won";
        winnerAddress = gamePlayer;
        winnerLabel = "Player 2";
        resultColor = "success";
        break;
      case 3:
        resultText = "Tie - Both players get their bets back";
        winnerAddress = null;
        winnerLabel = "None";
        resultColor = "warning";
        break;
      default:
        resultText = `Unknown result (${gameResult})`;
        winnerAddress = null;
        winnerLabel = "Unknown";
        resultColor = "danger";
    }
    
    const isCurrentUserWinner = winnerAddress && winnerAddress.toLowerCase() === account.toLowerCase();
    
    return (
      <div>
        <div className={`alert alert-${resultColor}`}>
          <h3 className="h5 mb-0">Game Result: {resultText}</h3>
        </div>
        
        <div className="mt-4">
          <h4 className="h5 mb-3">Player Moves:</h4>
          <div className="row g-3">
            <div className="col-6">
              <div className="card bg-light">
                <div className="card-body">
                  <p className="small text-muted mb-1">Player 1 (Owner)</p>
                  <p className="h6 mb-0">{getChoiceText(gameContract?.ownerChoice)}</p>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card bg-light">
                <div className="card-body">
                  <p className="small text-muted mb-1">Player 2</p>
                  <p className="h6 mb-0">{getChoiceText(gameContract?.playerChoice)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {winnerAddress && (
          <div className="mt-4">
            <div className={`card ${isCurrentUserWinner ? 'bg-success bg-opacity-10' : 'bg-light'}`}>
              <div className="card-body">
                <h4 className="h5 mb-2">Winner: {winnerLabel}</h4>
                <p className="font-monospace small mb-0">
                  {winnerAddress.substring(0, 6)}...{winnerAddress.substring(38)}
                </p>
                {isCurrentUserWinner && (
                  <div className="mt-2 d-flex align-items-center text-success">
                    <span className="fs-4 me-2">🏆</span>
                    <p className="fw-bold mb-0">YOU WON! The prize has been sent to your wallet!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {gameResult === 3 && (
          <div className="alert alert-info mt-4">
            Each player received their bet back.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-4">
        <div className="mb-4">
          <h1 className="display-4 fw-bold text-dark">
            Rock Paper Scissors Factory
          </h1>
          <div className={`mt-3 p-3 rounded ${status.includes('Error') ? 'bg-danger bg-opacity-10 text-danger' : 'bg-primary bg-opacity-10 text-primary'}`}>
            {status}
          </div>
        </div>

        <div className="mb-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 mb-0">Game Contracts</h2>
                <button
                  onClick={createNewGame}
                  className="btn btn-primary d-inline-flex align-items-center"
                >
                  <span className="me-2">🎲</span>
                  Create New Game Contract
                </button>
              </div>

              <h3 className="h4 mb-3">Available Game Contracts</h3>
              {availableGames.length === 0 ? (
                <div className="alert alert-info">
                  No available game contracts found
                </div>
              ) : (
                <div className="list-group">
                  {availableGames.map((game, index) => (
                    <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <p className="font-monospace small mb-1">{game.address}</p>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${game.isOwner ? 'bg-primary' : game.isPlayer ? 'bg-purple' : 'bg-secondary'}`}>
                            {game.isOwner 
                              ? (game.hasPlayed ? 'Waiting for Player' : 'Your Game')
                              : game.isPlayer
                                ? 'Your Joined Game'
                                : 'Joinable Game'}
                          </span>
                          <span className="text-muted small">
                            Bet: {ethers.formatEther(game.betAmount)} ETH
                          </span>
                        </div>
                      </div>
                      {game.isOwner && game.hasPlayed ? (
                        <button
                          onClick={() => selectGame(game.address)}
                          className="btn btn-outline-secondary"
                        >
                          View
                        </button>
                      ) : game.isPlayer ? (
                        <button
                          onClick={() => selectGame(game.address)}
                          className="btn btn-purple"
                        >
                          View Game
                        </button>
                      ) : (
                        <button
                          onClick={() => selectGame(game.address)}
                          className={`btn ${game.isOwner ? 'btn-primary' : 'btn-purple'}`}
                        >
                          {game.isOwner ? 'Make Move' : 'Join Game'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {completedGames.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowCompletedGames(!showCompletedGames)}
                    className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
                  >
                    Completed Games ({completedGames.length})
                    <span>{showCompletedGames ? '▲' : '▼'}</span>
                  </button>
                  {showCompletedGames && (
                    <div className="list-group mt-2">
                      {completedGames.map((gameAddress, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <p className="font-monospace small mb-0">{gameAddress}</p>
                          <button
                            onClick={() => selectGame(gameAddress)}
                            className="btn btn-outline-secondary btn-sm"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedGame && (
            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h2 className="h3 mb-3">Selected Game</h2>
                <p className="font-monospace small mb-4">{selectedGame}</p>

                <div className="card bg-light mb-4">
                  <div className="card-body">
                    <h3 className="h4 mb-3">Players</h3>
                    <div className="mb-3">
                      {gameOwner && (
                        <div className="d-flex align-items-center mb-2">
                          <span className="text-muted me-2">👤</span>
                          <div>
                            <p className="small mb-1">
                              <span className="fw-medium">Player 1 (Owner):</span>{' '}
                              {gameOwner.substring(0, 6)}...{gameOwner.substring(38)}
                            </p>
                            {gameOwner.toLowerCase() === account.toLowerCase() && (
                              <span className="badge bg-primary">You</span>
                            )}
                          </div>
                        </div>
                      )}
                      {gamePlayer ? (
                        <div className="d-flex align-items-center">
                          <span className="text-muted me-2">👤</span>
                          <div>
                            <p className="small mb-1">
                              <span className="fw-medium">Player 2:</span>{' '}
                              {gamePlayer.substring(0, 6)}...{gamePlayer.substring(38)}
                            </p>
                            {gamePlayer.toLowerCase() === account.toLowerCase() && (
                              <span className="badge bg-purple">You</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        gameState === 1 && (
                          <p className="small text-muted mb-0">
                            <span className="fw-medium">Player 2:</span> Waiting for someone to join...
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="card bg-light">
                  <div className="card-body">
                    <h3 className="h4 mb-3">Game Status</h3>
                    {gameState === 2 && gameOwner.toLowerCase() === account.toLowerCase() && (
                      <div>
                        <h4 className="h5 mb-3">Reveal Your Choice</h4>
                        <div className="mb-3">
                          <label htmlFor="revealChoice" className="form-label">Your Choice</label>
                          <select
                            id="revealChoice"
                            value={revealChoiceValue || ''}
                            onChange={(e) => setRevealChoiceValue(Number(e.target.value))}
                            className="form-select mb-3"
                          >
                            <option value="">Select your choice</option>
                            <option value="1">✊ Rock</option>
                            <option value="2">✋ Paper</option>
                            <option value="3">✌️ Scissors</option>
                          </select>
                          <label htmlFor="revealSalt" className="form-label">Your Salt</label>
                          <input
                            id="revealSalt"
                            type="text"
                            value={revealSalt}
                            onChange={(e) => setRevealSalt(e.target.value)}
                            placeholder="Enter the same salt you used before"
                            className="form-control mb-3"
                          />
                          <button
                            onClick={revealChoice}
                            className="btn btn-primary"
                          >
                            Reveal Your Choice
                          </button>
                        </div>
                      </div>
                    )}
                    {gameState === 0 && gameOwner.toLowerCase() === account.toLowerCase() && (
                      <div>
                        <h4 className="h5 mb-3">Make Your Move</h4>
                        <p className="text-muted mb-3">Set your bet amount, choose Rock, Paper, or Scissors, and enter a salt to start the game.</p>
                        <div className="mb-3">
                          <label htmlFor="betAmount" className="form-label">Bet Amount (ETH)</label>
                          <input
                            id="betAmount"
                            type="text"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            placeholder="Enter bet amount in ETH"
                            className="form-control mb-3"
                          />
                          <label htmlFor="ownerSalt" className="form-label">Salt (remember this for reveal)</label>
                          <input
                            id="ownerSalt"
                            type="text"
                            value={ownerSalt}
                            onChange={(e) => setOwnerSalt(e.target.value)}
                            placeholder="Enter a salt (any text)"
                            className="form-control mb-3"
                          />
                          <div className="d-grid gap-2 d-md-flex">
                            <button
                              onClick={() => makeFirstMove(1)}
                              className="btn btn-primary flex-grow-1"
                            >
                              ✊ Rock
                            </button>
                            <button
                              onClick={() => makeFirstMove(2)}
                              className="btn btn-primary flex-grow-1"
                            >
                              ✋ Paper
                            </button>
                            <button
                              onClick={() => makeFirstMove(3)}
                              className="btn btn-primary flex-grow-1"
                            >
                              ✌️ Scissors
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {gameState === 1 && gameOwner.toLowerCase() !== account.toLowerCase() && (
                      <div>
                        <h4 className="h5 mb-3">Join Game</h4>
                        <p className="small mb-3">
                          Bet Amount: <span className="fw-medium">{ethers.formatEther(betAmount)} ETH</span>
                        </p>
                        <div className="d-grid gap-2 d-md-flex">
                          <button
                            onClick={() => joinGame(1)}
                            className="btn btn-purple flex-grow-1"
                          >
                            ✊ Rock
                          </button>
                          <button
                            onClick={() => joinGame(2)}
                            className="btn btn-purple flex-grow-1"
                          >
                            ✋ Paper
                          </button>
                          <button
                            onClick={() => joinGame(3)}
                            className="btn btn-purple flex-grow-1"
                          >
                            ✌️ Scissors
                          </button>
                        </div>
                      </div>
                    )}
                    {gameState === 3 && (
                      <div className="mt-4">
                        {renderGameResult()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FactoryApp; 