// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice A simple ERC-20 token that mimics USDC for local testing.
 *         Anyone can call mint() to get tokens — this is intentional for demo purposes.
 *         6 decimals to match real USDC.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    // 1,000,000 USDC minted to deployer at construction
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 6;

    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Returns 6 decimals to match real USDC.
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Public faucet — anyone can mint up to 10,000 mUSDC for testing.
     * @param to      Recipient address
     * @param amount  Amount in smallest unit (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        require(amount <= 10_000 * 10 ** 6, "MockUSDC: max 10,000 per mint");
        _mint(to, amount);
    }

    /**
     * @notice Owner can mint any amount — used by deploy/seed scripts.
     */
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
