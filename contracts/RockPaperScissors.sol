// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

contract RockPaperScissors {
    address public owner;
    
    enum Choice { None, Rock, Paper, Scissors }
    enum Result { None, OwnerWon, PlayerWon, Tie }
    enum GameState { Created, InProgress, Completed }
    
    // Single game instance
    address public player;
    uint256 public betAmount;
    Choice public ownerChoice;
    Choice public playerChoice;
    bool public isCompleted;
    Result public result;
    GameState public state;
    
    // Events
    event GameCreated(address owner, uint256 betAmount);
    event PlayerJoined(address player);
    event GameCompleted(address winner, Result result);
    
    constructor() {
        owner = msg.sender;
        state = GameState.Created;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    function determineWinner(Choice _ownerChoice, Choice _playerChoice) internal pure returns (Result) {
        if (_ownerChoice == _playerChoice) {
            return Result.Tie;
        }
        
        if (_ownerChoice == Choice.Rock) {
            return _playerChoice == Choice.Scissors ? Result.OwnerWon : Result.PlayerWon;
        } else if (_ownerChoice == Choice.Paper) {
            return _playerChoice == Choice.Rock ? Result.OwnerWon : Result.PlayerWon;
        } else { // Scissors
            return _playerChoice == Choice.Paper ? Result.OwnerWon : Result.PlayerWon;
        }
    }
    
    function createGame(Choice _ownerChoice) external payable onlyOwner {
        require(state == GameState.Created && ownerChoice == Choice.None, "Game already initialized");
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(_ownerChoice != Choice.None, "Invalid choice");
        
        betAmount = msg.value;
        ownerChoice = _ownerChoice;
        
        emit GameCreated(owner, msg.value);
    }

    function getGameInfo() external view returns (
        bool exists,
        bool canJoin,
        uint256 _betAmount,
        GameState _state
    ) {
        exists = ownerChoice != Choice.None;
        canJoin = exists && player == address(0) && !isCompleted;
        _betAmount = betAmount;
        _state = state;
    }
    
    function joinGame(Choice _playerChoice) external payable {
        require(ownerChoice != Choice.None, "Game not initialized");
        require(player == address(0), "Game already has a player");
        require(msg.sender != owner, "Owner cannot join their own game");
        require(msg.value == betAmount, "Must match the owner's bet amount");
        require(state == GameState.Created, "Game not in correct state");
        require(_playerChoice != Choice.None, "Invalid choice");
        
        player = msg.sender;
        playerChoice = _playerChoice;
        state = GameState.InProgress;
        
        emit PlayerJoined(msg.sender);
        
        // Since both choices are now made, complete the game
        completeGame();
    }
    
    function completeGame() internal {
        require(!isCompleted, "Game already completed");
        
        result = determineWinner(ownerChoice, playerChoice);
        isCompleted = true;
        state = GameState.Completed;
        
        if (result == Result.Tie) {
            // Return bets to both players
            payable(owner).transfer(betAmount);
            payable(player).transfer(betAmount);
        } else if (result == Result.OwnerWon) {
            // Owner gets the pot
            payable(owner).transfer(betAmount * 2);
        } else {
            // Player gets the pot
            payable(player).transfer(betAmount * 2);
        }
        
        emit GameCompleted(result == Result.OwnerWon ? owner : player, result);
    }
} 