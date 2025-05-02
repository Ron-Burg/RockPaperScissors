// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

contract RockPaperScissors {
    address public owner;
    
    enum Choice { None, Rock, Paper, Scissors }
    enum Result { None, OwnerWon, PlayerWon, Tie }
    enum GameState { Created, InProgress, Completed }
    
    struct Game {
        address owner;
        address player;
        uint256 betAmount;
        Choice ownerChoice;
        Choice playerChoice;
        bool isCompleted;
        Result result;
        GameState state;
    }
    
    mapping(uint256 => Game) public games;
    uint256 public gameCount;
    
    event GameCreated(uint256 gameId, address owner, uint256 betAmount);
    event PlayerJoined(uint256 gameId, address player);
    event GameCompleted(uint256 gameId, address winner, Result result);
    
    constructor() {
        owner = msg.sender;
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
    
    function createGame(Choice _ownerChoice) external payable onlyOwner {
        require(msg.value > 0, "Bet amount must be greater than 0");
        require(_ownerChoice != Choice.None, "Invalid choice");
        
        uint256 gameId = gameCount++;
        games[gameId] = Game({
            owner: msg.sender,
            player: address(0),
            betAmount: msg.value,
            ownerChoice: _ownerChoice,
            playerChoice: Choice.None,
            isCompleted: false,
            result: Result.None,
            state: GameState.Created
        });
        
        emit GameCreated(gameId, msg.sender, msg.value);
    }

    function getGameInfo(uint256 _gameId) external view returns (
        bool exists,
        bool canJoin,
        uint256 betAmount,
        GameState state
    ) {
        Game storage game = games[_gameId];
        exists = game.owner != address(0);
        canJoin = exists && game.player == address(0) && !game.isCompleted;
        betAmount = game.betAmount;
        state = game.state;
    }
    
    function joinGame(uint256 _gameId, Choice _playerChoice) external payable {
        Game storage game = games[_gameId];
        require(game.owner != address(0), "Game does not exist");
        require(game.player == address(0), "Game already has a player");
        require(msg.sender != game.owner, "Owner cannot join their own game");
        require(msg.value == game.betAmount, "Must match the owner's bet amount");
        require(game.state == GameState.Created, "Game not in correct state");
        require(_playerChoice != Choice.None, "Invalid choice");
        
        game.player = msg.sender;
        game.playerChoice = _playerChoice;
        game.state = GameState.InProgress;
        
        emit PlayerJoined(_gameId, msg.sender);
        
        // Since both choices are now made, complete the game
        completeGame(_gameId);
    }
    
    function completeGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        require(!game.isCompleted, "Game already completed");
        
        Result result = determineWinner(game.ownerChoice, game.playerChoice);
        game.isCompleted = true;
        game.result = result;
        game.state = GameState.Completed;
        
        if (result == Result.Tie) {
            // Return bets to both players
            payable(game.owner).transfer(game.betAmount);
            payable(game.player).transfer(game.betAmount);
        } else if (result == Result.OwnerWon) {
            // Owner gets the pot
            payable(game.owner).transfer(game.betAmount * 2);
        } else {
            // Player gets the pot
            payable(game.player).transfer(game.betAmount * 2);
        }
        
        emit GameCompleted(_gameId, result == Result.OwnerWon ? game.owner : game.player, result);
    }
} 