import React from 'react';
import { ethers } from 'ethers';

const GameStatus = ({ 
  gameState, 
  gameAddress, 
  betAmount, 
  ownerChoice, 
  playerChoice, 
  gameOwner, 
  gamePlayer, 
  gameResult,
  account
}) => {
  const getChoiceText = (choice) => {
    const choiceNum = Number(choice);
    if (isNaN(choiceNum)) return "Unknown";
    
    switch (choiceNum) {
      case 1: return "✊ Rock";
      case 2: return "✋ Paper";
      case 3: return "✌️ Scissors";
      default: return "Unknown";
    }
  };

  const isOwner = gameOwner?.toLowerCase() === account.toLowerCase();

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
        resultColor = gameOwner.toLowerCase() === account.toLowerCase() ? "success" : "danger";
        break;
      case 2:
        resultText = "Player (Player 2) won";
        winnerAddress = gamePlayer;
        winnerLabel = "Player 2";
        resultColor = gamePlayer.toLowerCase() === account.toLowerCase() ? "success" : "danger";
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
    const isCurrentUserLoser = winnerAddress && winnerAddress.toLowerCase() !== account.toLowerCase() && 
      (gameOwner.toLowerCase() === account.toLowerCase() || gamePlayer.toLowerCase() === account.toLowerCase());
    
    return (
      <div>
        <div className={`alert alert-${resultColor}`}>
          <h3 className="h5 mb-0">Game Result: {resultText}</h3>
          <p className="small mb-0 mt-2">Bet Amount: {ethers.formatEther(betAmount)} ETH</p>
          {winnerAddress && (
            <div className="mt-2">
              {isCurrentUserWinner && (
                <p className="small mb-0 d-inline-flex align-items-center text-success">
                  <span className="fs-5 me-1">🏆</span>
                  <span className="fw-bold">YOU WON! The prize has been sent to your wallet!</span>
                </p>
              )}
              {isCurrentUserLoser && (
                <p className="small mb-0 d-inline-flex align-items-center text-danger">
                  <span className="fs-5 me-1">😢</span>
                  <span className="fw-bold">You lost this game</span>
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <h4 className="h5 mb-3">Player Moves:</h4>
          <div className="row g-3">
            <div className="col-6">
              <div className="card bg-light">
                <div className="card-body">
                  <p className="small text-muted mb-1">Player 1 (Owner)</p>
                  <p className="h6 mb-1">{getChoiceText(ownerChoice)}</p>
                  <p className="font-monospace small text-muted mb-0">
                    {gameOwner.substring(0, 6)}...{gameOwner.substring(38)}
                    {gameOwner.toLowerCase() === account.toLowerCase() && (
                      <span className="badge bg-primary ms-2">You</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card bg-light">
                <div className="card-body">
                  <p className="small text-muted mb-1">Player 2</p>
                  <p className="h6 mb-1">{getChoiceText(playerChoice)}</p>
                  <p className="font-monospace small text-muted mb-0">
                    {gamePlayer.substring(0, 6)}...{gamePlayer.substring(38)}
                    {gamePlayer.toLowerCase() === account.toLowerCase() && (
                      <span className="badge bg-primary ms-2">You</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="h4 mb-1">Game Status</h3>
        <p className="font-monospace small text-muted mb-0">{gameAddress}</p>
      </div>
      {gameState === 0 && (
        <div className={`alert ${isOwner ? 'alert-success' : 'alert-warning'}`}>
          {isOwner 
            ? "Ready to make your move"
            : "Game is deployed, waiting for owner to make their move"}
        </div>
      )}
      {gameState === 1 && (
        <div className={`alert ${!isOwner ? 'alert-success' : 'alert-warning'}`}>
          {isOwner
            ? "Waiting for player to join"
            : "Ready to join the game"}
        </div>
      )}
      {gameState === 2 && (
        <div className={`alert ${isOwner ? 'alert-success' : 'alert-warning'}`}>
          {isOwner 
            ? "Ready to reveal your choice"
            : "Waiting for owner to reveal their choice"}
        </div>
      )}
      {gameState === 3 && (
        <div className="mt-4">
          {renderGameResult()}
        </div>
      )}
    </div>
  );
};

export default GameStatus; 