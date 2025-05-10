import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RockPaperScissorsFactory from './contracts/RockPaperScissorsFactory.json';
import RockPaperScissors from './contracts/RockPaperScissors.json';

function FactoryApp() {
  const [factoryContract, setFactoryContract] = useState(null);
  const [account, setAccount] = useState('');
  const [status, setStatus] = useState('');
  const [games, setGames] = useState([]);
  const [completedGames, setCompletedGames] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);
  const [showCompletedGames, setShowCompletedGames] = useState(false);
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

  // Add new useEffect to load games when account changes
  useEffect(() => {
    if (account && factoryContract) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getSigner().then(signer => {
        loadGames(factoryContract, signer);
      });
    }
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
      setGames(gameAddresses);
      
      // Separate games into completed and available
      const completed = [];
      const available = [];
      
      for (const address of gameAddresses) {
        const game = new ethers.Contract(address, RockPaperScissors.abi, signer);
        const isCompleted = await game.isCompleted();
        const owner = await game.owner();
        const player = await game.player();
        const isOwner = owner.toLowerCase() === account.toLowerCase();
        const isPlayer = player.toLowerCase() === account.toLowerCase();
        
        if (isCompleted) {
          // Only add to completed if user was a participant
          if (isOwner || isPlayer) {
            completed.push(address);
          }
        } else {
          // Get game info to determine state
          const gameInfo = await game.getGameInfo();
          
          // Game is available if:
          // 1. User is the owner and hasn't made their move yet (!gameInfo.exists)
          // 2. User is not the owner, first move is done (gameInfo.exists), and can join (gameInfo.canJoin)
          // 3. User is the owner and has made their move (gameInfo.exists)
          if ((isOwner && !gameInfo.exists) || 
              (!isOwner && gameInfo.exists && gameInfo.canJoin) ||
              (isOwner && gameInfo.exists)) {
            available.push({
              address,
              isOwner,
              canJoin: gameInfo.canJoin,
              betAmount: gameInfo._betAmount,
              hasPlayed: isOwner && gameInfo.exists
            });
          }
        }
      }
      
      setCompletedGames(completed);
      setAvailableGames(available);
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

  const makeFirstMove = async (choice) => {
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
      
      if (!selectedGame) {
        setStatus('Please select a game first');
        return;
      }
      
      setStatus('Making your move...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const game = new ethers.Contract(selectedGame, RockPaperScissors.abi, signer);
      
      const tx = await game.createGame(choice, {
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();
      
      setStatus('Move made successfully!');
      
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

      // Get player choices
      try {
        const ownerChoice = await game.ownerChoice();
        const playerChoice = await game.playerChoice();
        console.log("Owner choice:", ownerChoice, "Player choice:", playerChoice);
        // Update the contract instance with the choices
        game.ownerChoice = ownerChoice;
        game.playerChoice = playerChoice;
      } catch (error) {
        console.error("Error getting player choices:", error);
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
        
        // Also refresh the available games list
        await loadGames(factoryContract, signer);
      } catch (joinError) {
        console.error("Error joining game:", joinError);
        setStatus(`Error joining game: ${joinError.message}`);
      }
    } catch (error) {
      console.error("Error in join game function:", error);
      setStatus(`Error: ${error.message}`);
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
                          <span className={`badge ${game.isOwner ? 'bg-primary' : 'bg-purple'}`}>
                            {game.isOwner 
                              ? (game.hasPlayed ? 'Waiting for Player' : 'Your Game')
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
                      {gamePlayer && gamePlayer !== ethers.ZeroAddress ? (
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
                        gameInfo && gameInfo.exists && gameInfo.canJoin && (
                          <p className="small text-muted mb-0">
                            <span className="fw-medium">Player 2:</span> Waiting for someone to join...
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {gameInfo && (gameInfo._state === 2 || isCompleted) && (
                  <div className="card bg-light">
                    <div className="card-body">
                      {renderGameResult()}
                    </div>
                  </div>
                )}

                {gameInfo && !gameInfo.exists && (
                  <div className="card bg-light">
                    <div className="card-body">
                      <h3 className="h4 mb-3">Make Your Move</h3>
                      <div className="mb-3">
                        <input
                          type="text"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder="Bet Amount (ETH)"
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
                  </div>
                )}

                {gameInfo && gameInfo.exists && gameInfo.canJoin && gameOwner.toLowerCase() !== account.toLowerCase() && (
                  <div className="card bg-light">
                    <div className="card-body">
                      <h3 className="h4 mb-3">Join Game</h3>
                      <p className="small mb-3">
                        Bet Amount: <span className="fw-medium">{gameInfo._betAmount ? ethers.formatEther(gameInfo._betAmount) : '0'} ETH</span>
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
                  </div>
                )}

                {gameInfo && gameInfo.exists && !gameInfo.canJoin && gameInfo._state === 1 && (
                  <div className="card bg-light">
                    <div className="card-body">
                      <h3 className="h4 mb-3">Game Status: In Progress</h3>
                      <p className="small text-muted mb-2">
                        The game is currently in progress. Waiting for completion...
                      </p>
                      <p className="small text-muted mb-0">
                        Once both players have made their moves, the game will complete automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FactoryApp; 