import React from 'react';
import { ethers } from 'ethers';

const GameActions = ({
  gameState,
  isOwner,
  betAmount,
  onRevealChoice,
  onMakeMove,
  onJoinGame,
  revealChoiceValue,
  setRevealChoiceValue,
  revealSalt,
  setRevealSalt,
  ownerSalt,
  setOwnerSalt
}) => {
  if (gameState === 2 && isOwner) {
    return (
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
            onClick={onRevealChoice}
            className="btn btn-primary"
          >
            Reveal Your Choice
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 0 && isOwner) {
    return (
      <div>
        <h4 className="h5 mb-3">Make Your Move</h4>
        <p className="text-muted mb-3">Set your bet amount, choose Rock, Paper, or Scissors, and enter a salt to start the game.</p>
        <div className="mb-3">
          <label htmlFor="betAmount" className="form-label">Bet Amount (ETH)</label>
          <input
            id="betAmount"
            type="text"
            value={ethers.formatEther(betAmount)}
            onChange={(e) => onMakeMove(0, e.target.value)}
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
              onClick={() => onMakeMove(1)}
              className="btn btn-primary flex-grow-1"
            >
              ✊ Rock
            </button>
            <button
              onClick={() => onMakeMove(2)}
              className="btn btn-primary flex-grow-1"
            >
              ✋ Paper
            </button>
            <button
              onClick={() => onMakeMove(3)}
              className="btn btn-primary flex-grow-1"
            >
              ✌️ Scissors
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 1 && !isOwner) {
    return (
      <div>
        <h4 className="h5 mb-3">Join Game</h4>
        <p className="small mb-3">
          Bet Amount: <span className="fw-medium">{ethers.formatEther(betAmount)} ETH</span>
        </p>
        <div className="d-grid gap-2 d-md-flex">
          <button
            onClick={() => onJoinGame(1)}
            className="btn btn-primary flex-grow-1"
          >
            ✊ Rock
          </button>
          <button
            onClick={() => onJoinGame(2)}
            className="btn btn-primary flex-grow-1"
          >
            ✋ Paper
          </button>
          <button
            onClick={() => onJoinGame(3)}
            className="btn btn-primary flex-grow-1"
          >
            ✌️ Scissors
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default GameActions; 