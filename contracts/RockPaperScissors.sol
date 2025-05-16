// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

contract RockPaperScissors {
    address public owner;
    
    enum Choice { None, Rock, Paper, Scissors }
    enum Result { None, OwnerWon, PlayerWon, Tie }
    enum GameState { Deployed, Committed, WaitingForReveal, Completed }
    
    // Single game instance
    uint256 public betAmount;
    bytes32 public ownerCommit;
    Choice public ownerChoice;
    address public player;
    Choice public playerChoice;
    Result public result;
    GameState public state;
            
    // Events
    event GameStarted(address owner, uint256 betAmount);
    event PlayerJoined(address player, Choice choice);
    event GameCompleted(Result result);
    event ChoiceCommitted(address player);
    event ChoiceRevealed(address player, Choice choice);
    
    constructor(address _owner) {
        owner = _owner;
        state = GameState.Deployed;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
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
    
    function startGame(bytes32 _ownerCommit) external payable onlyOwner {
        require(state == GameState.Deployed && ownerCommit == bytes32(0), "Game already initialized");
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        betAmount = msg.value;
        ownerCommit = _ownerCommit;
        state = GameState.Committed;
        
        emit GameStarted(owner, msg.value);
    }

    
    function joinGame(Choice _playerChoice) external payable {
        require(state == GameState.Committed, "Game not in correct state");
        require(player == address(0), "Game already has a player");
        require(msg.sender != owner, "Owner cannot join their own game");
        require(msg.value == betAmount, "Must match the owner's bet amount");
        require(_playerChoice != Choice.None, "Invalid choice");
        
        player = msg.sender;
        playerChoice = _playerChoice;
        state = GameState.WaitingForReveal;
        
        emit PlayerJoined(msg.sender, _playerChoice);
    }
    
    function revealChoice(Choice _choice, bytes32 _salt) external {
        require(state == GameState.WaitingForReveal, "Game not in waiting for reveal state");
        require(msg.sender == owner, "Only owner can reveal");
        
        bytes32 commit = keccak256(abi.encodePacked(_choice, _salt));
        require(commit == ownerCommit, "Invalid owner commit");
        
        // Verify the choice is valid (Rock, Paper, or Scissors)
        if (_choice == Choice.None || _choice > Choice.Scissors) {
            // If invalid choice, player wins by default
            result = Result.PlayerWon;
        }
        
        ownerChoice = _choice;
        emit ChoiceRevealed(msg.sender, _choice);
        
        // Since both choices are now known, complete the game
        completeGame();
    }
    
    function completeGame() internal {
        require(ownerChoice != Choice.None, "Owner must reveal first");
        
        if (result == Result.None) {
            result = determineWinner(ownerChoice, playerChoice);
        }
        
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
        
        emit GameCompleted(result);
    }
} 