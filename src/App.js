import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RockPaperScissors from './contracts/RockPaperScissors.json';

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [gameId, setGameId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    initWeb3();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('Account changed to:', accounts[0]);
        setStatus('Account changed. Reconnecting...');
        initWeb3();
      });

      window.ethereum.on('chainChanged', (chainId) => {
        console.log('Network changed to:', chainId);
        setStatus('Network changed. Reconnecting...');
        initWeb3();
      });
    }

    // Cleanup listeners when component unmounts
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', initWeb3);
        window.ethereum.removeListener('chainChanged', initWeb3);
      }
    };
  }, []);

  const initWeb3 = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const account = await signer.getAddress();
        setAccount(account);

        // Replace with your deployed contract address
        const contractAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
        const contract = new ethers.Contract(contractAddress, RockPaperScissors.abi, signer);
        setContract(contract);
        
        setStatus('Connected to MetaMask');
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        setStatus('Error connecting to MetaMask: ' + error.message);
      }
    } else {
      setStatus('Please install MetaMask to use this app');
    }
  };

  const createGame = async (choice) => {
    try {
      if (!betAmount || betAmount === '') {
        setStatus('Please enter a bet amount');
        return;
      }
      const tx = await contract.createGame(choice, {
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();
      setStatus('Game created successfully!');
    } catch (error) {
      setStatus('Error creating game: ' + error.message);
    }
  };

  const joinGame = async (choice) => {
    try {
      if (!gameId || gameId === '') {
        setStatus('Please enter a game ID');
        return;
      }

      // Get the required bet amount for this game
      const gameInfo = await contract.getGameInfo(gameId);
      console.log("Game info:", gameInfo);
      
      if (!gameInfo.exists) {
        setStatus('Game does not exist');
        return;
      }
      
      if (!gameInfo.canJoin) {
        setStatus('Cannot join this game');
        return;
      }
      
      // Use the bet amount from the game
      const tx = await contract.joinGame(gameId, choice, {
        value: gameInfo.betAmount
      });
      await tx.wait();
      setStatus('Joined game successfully!');
    } catch (error) {
      setStatus('Error joining game: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Rock Paper Scissors</h1>
      <p>Connected Account: {account}</p>
      <p>Status: {status}</p>

      <div style={{ marginBottom: '20px' }}>
        <h2>Create Game</h2>
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

      <div>
        <h2>Join Game</h2>
        <input
          type="text"
          placeholder="Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          style={{ marginRight: '10px' }}
        />
        <button onClick={() => joinGame(1)}>Rock</button>
        <button onClick={() => joinGame(2)}>Paper</button>
        <button onClick={() => joinGame(3)}>Scissors</button>
      </div>
    </div>
  );
}

export default App; 