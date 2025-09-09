// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./Ownable.sol";

/**
 * @title MultiTokenSender
 * @dev Contract for multi-sending ERC20 tokens only (no fees)
 */
contract MultiTokenSender is Ownable {
    using SafeERC20 for IERC20;
    
    // Event definitions
    event ERC20TokensSent(address indexed token, address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Send ERC20 tokens to multiple addresses simultaneously
     * @param token ERC20 token contract address
     * @param recipients Array of recipient addresses
     * @param amounts Array of token amounts to send to each recipient
     */
    function sendTokens(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(token != address(0), "MultiTokenSender: token address cannot be zero");
        require(recipients.length > 0, "MultiTokenSender: recipients array cannot be empty");
        require(recipients.length == amounts.length, "MultiTokenSender: recipients and amounts length mismatch");
        
        uint256 totalAmount = 0;
        uint256 length = amounts.length;
        
        // Validate amounts and calculate total
        for (uint256 i = 0; i < length;) {
            uint256 amount = amounts[i];
            require(amount > 0, "MultiTokenSender: amount must be greater than 0");
            require(recipients[i] != address(0), "MultiTokenSender: recipient cannot be zero address");
            totalAmount += amount;
            unchecked { ++i; }
        }
        
        // Transfer tokens to contract
        IERC20 tokenContract = IERC20(token);
        tokenContract.safeTransferFrom(msg.sender, address(this), totalAmount);
        
        // Send tokens to each recipient
        for (uint256 i = 0; i < length;) {
            tokenContract.safeTransfer(recipients[i], amounts[i]);
            unchecked { ++i; }
        }
        
        emit ERC20TokensSent(token, msg.sender, totalAmount, recipients.length);
    }
    
    /**
     * @dev Emergency token withdrawal (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "MultiTokenSender: token address cannot be zero");
        IERC20 tokenContract = IERC20(token);
        require(tokenContract.balanceOf(address(this)) >= amount, "MultiTokenSender: insufficient token balance");
        tokenContract.safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }
    
    /**
     * @dev Get contract ERC20 token balance
     * @param token Token address
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
