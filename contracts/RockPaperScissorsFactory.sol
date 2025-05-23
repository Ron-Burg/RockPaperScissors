// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import "./RockPaperScissors.sol";

/**
 * @title RockPaperScissorsFactory
 * @dev A factory contract that creates new RockPaperScissors game instances
 * Each deployed contract represents a single game with one owner and one potential player
 */
contract RockPaperScissorsFactory {
    // Array of all deployed game contracts
    RockPaperScissors[] public games;
    
    // Mapping to verify if a contract was created by this factory
    mapping(address => bool) public isGameCreatedByFactory;
    
    // Event emitted when a new game contract is created
    event GameContractCreated(address gameAddress, address creator);
    
    /**
     * @dev Creates a new RockPaperScissors game contract
     * @return address The address of the newly created game contract
     */
    function createGame() public returns (address) {
        // Deploy a new RockPaperScissors contract
        RockPaperScissors game = new RockPaperScissors(msg.sender);
        games.push(game);
        isGameCreatedByFactory[address(game)] = true;
        
        emit GameContractCreated(address(game), msg.sender);
        
        return address(game);
    }
    
    /**
     * @dev Gets all deployed game contracts
     * @return RockPaperScissors[] Array of game contracts
     */
    function getGames() public view returns (RockPaperScissors[] memory) {
        return games;
    }
    
    /**
     * @dev Gets the total number of deployed game contracts
     * @return uint256 The count of deployed game contracts
     */
    function getGameCount() external view returns (uint256) {
        return games.length;
    }
} 