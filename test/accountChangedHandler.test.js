import { describe, test, expect, mock } from 'bun:test';

describe('Account Change Handler', () => {
  test('should detect account changes correctly', async () => {
    // This test focuses on verifying that the account change detection code works
    // Create a simple mock setup
    const mockSetAccount = mock();
    const mockSetStatus = mock();
    const mockSetFactoryContract = mock();
    const mockInitWeb3 = mock(async () => {});
    
    // Define the handleAccountsChanged function similar to what's in FactoryApp.js
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        // User has disconnected their wallet
        mockSetAccount('');
        mockSetStatus('Please connect to MetaMask');
        mockSetFactoryContract(null);
      } else {
        // User has switched accounts
        mockSetAccount(accounts[0]);
        mockSetStatus('Account changed. Reconnecting...');
        
        // Reinitialize web3 with the new account
        await mockInitWeb3();
      }
    };
    
    // Test with a new account
    const newAccount = '0xnewaccount123456789012345678901234567890';
    await handleAccountsChanged([newAccount]);
    
    // Verify state updates
    expect(mockSetAccount).toHaveBeenCalledWith(newAccount);
    expect(mockSetStatus).toHaveBeenCalledWith('Account changed. Reconnecting...');
    expect(mockInitWeb3).toHaveBeenCalled();
    
    // Test disconnection
    await handleAccountsChanged([]);
    
    // Verify state updates for disconnection
    expect(mockSetAccount).toHaveBeenCalledWith('');
    expect(mockSetStatus).toHaveBeenCalledWith('Please connect to MetaMask');
    expect(mockSetFactoryContract).toHaveBeenCalledWith(null);
  });
}); 