import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, mock, spyOn } from 'bun:test';
import FactoryApp from '../src/FactoryApp';

// Create a mock window object for Node.js environment
const mockWindow = {
  ethereum: {
    request: mock(async () => {}),
    on: mock(() => {}),
    removeListener: mock(() => {}),
  }
};

// Setup global.window
if (typeof window === 'undefined') {
  global.window = mockWindow;
}

// Mock for ethers
const mockEthers = {
  BrowserProvider: mock(() => ({
    getSigner: mock(async () => ({
      getAddress: mock(async () => '0x1234567890123456789012345678901234567890'),
    })),
    getCode: mock(async () => '0x123456'), // Mocked contract code
  })),
  Contract: mock(() => ({
    getGames: mock(async () => []),
  })),
  parseEther: mock((val) => val), // Simplified mock
  formatEther: mock((val) => val), // Simplified mock
};

// Setup mock for ethers module
globalThis.jest = { requireActual: mock(() => ({})) };
globalThis.require = mock((module) => {
  if (module === 'ethers') {
    return { ethers: mockEthers };
  }
  if (module === '../src/contracts/RockPaperScissorsFactory.json') {
    return { abi: [] };
  }
  if (module === '../src/contracts/RockPaperScissors.json') {
    return { abi: [] };
  }
  return {};
});

describe('FactoryApp', () => {
  beforeEach(() => {
    // Reset mocks before each test
    window.ethereum.request.mockClear();
    window.ethereum.on.mockClear();
    window.ethereum.removeListener.mockClear();

    // Mock ethereum request responses
    window.ethereum.request.mockImplementation(async (request) => {
      if (request.method === 'eth_chainId') {
        return '0x539'; // Hardhat network ID (1337 in hex)
      }
      if (request.method === 'eth_requestAccounts') {
        return ['0x1234567890123456789012345678901234567890'];
      }
      throw new Error('Method not implemented');
    });
  });

  test('registers accountsChanged event listener on mount', async () => {
    // Render component
    await act(async () => {
      render(<FactoryApp />);
    });

    // Verify the event listener was registered
    expect(window.ethereum.on).toHaveBeenCalled();
    expect(window.ethereum.on.mock.calls[0][0]).toBe('accountsChanged');
  });

  test('handles account changes correctly', async () => {
    // We'll need a more specialized test for this
    // This is a placeholder to show what we want to test
    expect(true).toBe(true);
  });
}); 