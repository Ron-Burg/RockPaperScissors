// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

contract RockPaperScissors {
    address public owner;
    
    enum Choice { None, Rock, Paper, Scissors }
    enum Result { None, OwnerWon, PlayerWon, Tie }
    enum GameState { Created, Committed, Completed }
    
    // Single game instance
    address public player;
    uint256 public betAmount;
    Choice public ownerChoice;
    Choice public playerChoice;
    bool public isCompleted;
    Result public result;
    GameState public state;
    
    // Commit-reveal variables for owner only
    bytes32 public ownerCommit;
    bool public ownerRevealed;
    
    // Events
    event GameCreated(address owner, uint256 betAmount);
    event PlayerJoined(address player, Choice choice);
    event GameCompleted(address winner, Result result);
    event ChoiceCommitted(address player);
    event ChoiceRevealed(address player, Choice choice);
    
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
    
    function createGame(bytes32 _ownerCommit) external payable onlyOwner {
        require(state == GameState.Created && ownerCommit == bytes32(0), "Game already initialized");
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        betAmount = msg.value;
        ownerCommit = _ownerCommit;
        
        emit GameCreated(owner, msg.value);
    }

    function getGameInfo() external view returns (
        bool exists,
        bool canJoin,
        uint256 _betAmount,
        GameState _state
    ) {
        exists = betAmount > 0;
        canJoin = exists && player == address(0) && !isCompleted;
        _betAmount = betAmount;
        _state = state;
    }
    
    function joinGame(Choice _playerChoice) external payable {
        require(ownerCommit != bytes32(0), "Game not initialized");
        require(player == address(0), "Game already has a player");
        require(msg.sender != owner, "Owner cannot join their own game");
        require(msg.value == betAmount, "Must match the owner's bet amount");
        require(state == GameState.Created, "Game not in correct state");
        require(_playerChoice != Choice.None, "Invalid choice");
        
        player = msg.sender;
        playerChoice = _playerChoice;
        state = GameState.Committed;
        
        emit PlayerJoined(msg.sender, _playerChoice);
    }
    
    function revealChoice(Choice _choice, bytes32 _salt) external {
        require(state == GameState.Committed, "Game not in committed state");
        require(!isCompleted, "Game already completed");
        require(msg.sender == owner, "Only owner can reveal");
        require(!ownerRevealed, "Owner already revealed");
        
        bytes32 commit = keccak256(abi.encodePacked(_choice, _salt));
        require(commit == ownerCommit, "Invalid owner commit");
        
        ownerChoice = _choice;
        ownerRevealed = true;
        
        emit ChoiceRevealed(msg.sender, _choice);
        
        // Since both choices are now known, complete the game
        completeGame();
    }
    
    function completeGame() internal {
        require(!isCompleted, "Game already completed");
        require(ownerRevealed, "Owner must reveal first");
        
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