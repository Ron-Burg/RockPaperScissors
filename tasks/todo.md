[] Need to fix, winner is ditermend wrong in the front end. The contract part functions ok.
  [] Analyze the winner determination logic in the contract (determineWinner function in RockPaperScissors.sol)
  [] Check the renderGameResult function in FactoryApp.js to identify incorrect winner interpretation
  [] Fix the renderGameResult function to correctly map contract Result enum values to frontend display
  [] Add better error handling and validation when fetching and displaying game results
  [] Test the fix with different game outcomes (Owner wins, Player wins, Tie)

[] Make the front end look better, just in terms of UI/UX.
  [] Improve overall layout with consistent spacing and alignment
  [] Add visual icons for Rock, Paper, Scissors buttons
  [] Create clear visual indicators for different game states
  [] Implement responsive design for mobile compatibility 
  [] Add loading spinners during blockchain transactions
  [] Enhance color scheme and typography for better readability

[] Write some tests to make sure the front end behaving as expected.
  [] Set up Bun test environment with React Testing Library
  [] Create mock implementations for ethers.js contract interactions
  [] Write unit tests for the winner determination logic
  [] Test UI rendering for different game states
  [] Test user interactions and game flow
  [] Create end-to-end test for a complete game cycle 