# Account Change Detection in Rock Paper Scissors dApp

This document explains how account change detection is implemented in the Rock Paper Scissors dApp and how to test it.

## Implementation

The application uses MetaMask's event listeners to detect when a user changes their account or disconnects their wallet. This is implemented in the `FactoryApp.js` component using the following pattern:

```javascript
useEffect(() => {
  initWeb3();

  // Add event listeners for account and chain changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', () => window.location.reload());
  }

  // Cleanup function to remove event listeners
  return () => {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', () => window.location.reload());
    }
  };
}, []);

const handleAccountsChanged = async (accounts) => {
  if (accounts.length === 0) {
    // User has disconnected their wallet
    setAccount('');
    setStatus('Please connect to MetaMask');
    setFactoryContract(null);
  } else {
    // User has switched accounts
    setAccount(accounts[0]);
    setStatus('Account changed. Reconnecting...');
    
    // Reinitialize web3 with the new account
    await initWeb3();
  }
};
```

The `handleAccountsChanged` function:
1. Detects if the user has disconnected their wallet (accounts.length === 0)
2. Updates the account state with the new account address
3. Reinitializes the web3 connection to update contract instances with the new signer

## Testing

The account change detection functionality is tested using Bun's testing framework. There are two main test strategies:

1. **Unit Testing**: Testing the `handleAccountsChanged` function directly
   - Located in `test/accountChangedHandler.test.js`
   - Verifies that the function correctly responds to account changes and disconnections

2. **Integration Testing**: Testing the MetaMask event registration
   - Located in `test/FactoryApp.test.js`
   - Verifies that the component registers event listeners for account changes

To run the tests:

```bash
# Run all tests
bun test

# Run specific test file
bun test test/accountChangedHandler.test.js
```

## Common Issues

If account change detection stops working:

1. Check that the `useEffect` hook includes the event listeners for 'accountsChanged'
2. Verify that the `handleAccountsChanged` function is correctly updating state
3. Ensure that the cleanup function properly removes event listeners

## Best Practices

- Always include cleanup functions in useEffect hooks to prevent memory leaks
- Update all related state when an account changes (account address, contract instances)
- Test both the registration of event listeners and the handler functionality separately 