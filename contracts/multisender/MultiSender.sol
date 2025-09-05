// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";
import "./SafeERC20.sol";
import "./ReentrancyGuard.sol";
import "./Ownable.sol";

/**
 * @title MultiSender
 * @dev A contract that can send native tokens (ETH) and ERC20 tokens to multiple addresses simultaneously
 */
contract MultiSender is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Event definitions (indexed for gas optimization)
    event NativeTokensSent(address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event ERC20TokensSent(address indexed token, address indexed sender, uint256 totalAmount, uint256 recipientCount);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event VIPAdded(address indexed vipAddress);
    event VIPRemoved(address indexed vipAddress);
    
    // Fee settings (default 0.1%)
    uint256 public feePercentage = 10; // 0.1% = 10/10000
    uint256 public constant MAX_FEE_PERCENTAGE = 100; // Maximum 1%
    
    // Fee collector address
    address public feeCollector;
    
    // VIP address management
    mapping(address => bool) public isVIP;
    
    constructor() Ownable(msg.sender) {
        feeCollector = msg.sender;
    }
    
    /**
     * @dev Send native tokens (ETH) to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to send to each recipient
     */
    function sendNativeTokens(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable nonReentrant {
        require(recipients.length > 0, "MultiSender: recipients array cannot be empty");
        require(recipients.length == amounts.length, "MultiSender: recipients and amounts length mismatch");
        require(recipients.length <= 200, "MultiSender: too many recipients (max 200)");
        
        uint256 totalAmount = 0;
        uint256 length = amounts.length;
        for (uint256 i = 0; i < length;) {
            uint256 amount = amounts[i];
            require(amount > 0, "MultiSender: amount must be greater than 0");
            totalAmount += amount;
            unchecked { ++i; }
        }
        
        // Calculate fee (VIP users are exempt from fees)
        uint256 fee = 0;
        if (!isVIP[msg.sender]) {
            fee = (totalAmount * feePercentage) / 10000;
        }
        uint256 requiredAmount = totalAmount + fee;
        
        require(msg.value >= requiredAmount, "MultiSender: insufficient ETH sent");
        
        // Send ETH to each recipient
        for (uint256 i = 0; i < length;) {
            address recipient = recipients[i];
            require(recipient != address(0), "MultiSender: recipient cannot be zero address");
            (bool success, ) = recipient.call{value: amounts[i]}("");
            require(success, "MultiSender: ETH transfer failed");
            unchecked { ++i; }
        }
        
        // Send fee to collector
        if (fee > 0) {
            (bool feeSuccess, ) = feeCollector.call{value: fee}("");
            require(feeSuccess, "MultiSender: fee transfer failed");
        }
        
        // Refund remaining ETH to sender
        uint256 remaining = msg.value - requiredAmount;
        if (remaining > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: remaining}("");
            require(refundSuccess, "MultiSender: refund failed");
        }
        
        emit NativeTokensSent(msg.sender, totalAmount, recipients.length);
    }
    
    /**
     * @dev Send ERC20 tokens to multiple addresses
     * @param token ERC20 token contract address
     * @param recipients Array of recipient addresses
     * @param amounts Array of token amounts to send to each recipient
     */
    function sendERC20Tokens(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(token != address(0), "MultiSender: token address cannot be zero");
        require(recipients.length > 0, "MultiSender: recipients array cannot be empty");
        require(recipients.length == amounts.length, "MultiSender: recipients and amounts length mismatch");
        require(recipients.length <= 200, "MultiSender: too many recipients (max 200)");
        
        uint256 totalAmount = 0;
        uint256 length = amounts.length;
        for (uint256 i = 0; i < length;) {
            uint256 amount = amounts[i];
            require(amount > 0, "MultiSender: amount must be greater than 0");
            require(recipients[i] != address(0), "MultiSender: recipient cannot be zero address");
            totalAmount += amount;
            unchecked { ++i; }
        }
        
        // Calculate fee (VIP users are exempt from fees)
        uint256 fee = 0;
        if (!isVIP[msg.sender]) {
            fee = (totalAmount * feePercentage) / 10000;
        }
        uint256 requiredAmount = totalAmount + fee;
        
        // First transfer tokens to contract for distribution
        IERC20 tokenContract = IERC20(token);
        tokenContract.safeTransferFrom(msg.sender, address(this), requiredAmount);
        
        // Send tokens to each recipient
        for (uint256 i = 0; i < length;) {
            tokenContract.safeTransfer(recipients[i], amounts[i]);
            unchecked { ++i; }
        }
        
        // Send fee to collector
        if (fee > 0) {
            tokenContract.safeTransfer(feeCollector, fee);
        }
        
        emit ERC20TokensSent(token, msg.sender, totalAmount, recipients.length);
    }
    
    /**
     * @dev Set fee percentage (owner only)
     * @param _feePercentage New fee percentage (in 10000ths)
     */
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= MAX_FEE_PERCENTAGE, "MultiSender: fee percentage too high");
        feePercentage = _feePercentage;
    }
    
    /**
     * @dev Set fee collector address (owner only)
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "MultiSender: fee collector cannot be zero address");
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Emergency token withdrawal (owner only)
     * @param token Token address to withdraw (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // Withdraw ETH
            require(address(this).balance >= amount, "MultiSender: insufficient ETH balance");
            (bool success, ) = owner().call{value: amount}("");
            require(success, "MultiSender: ETH transfer failed");
        } else {
            // Withdraw ERC20 token
            IERC20 tokenContract = IERC20(token);
            require(tokenContract.balanceOf(address(this)) >= amount, "MultiSender: insufficient token balance");
            tokenContract.safeTransfer(owner(), amount);
        }
        
        emit EmergencyWithdraw(token, amount);
    }
    
    /**
     * @dev Get contract ETH balance
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get contract ERC20 token balance
     * @param token Token address
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    /**
     * @dev Calculate fee
     * @param amount Original amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * feePercentage) / 10000;
    }
    
    /**
     * @dev Add VIP address (owner only)
     * @param vipAddress Address to set as VIP
     */
    function addVIP(address vipAddress) external onlyOwner {
        require(vipAddress != address(0), "MultiSender: VIP address cannot be zero address");
        require(!isVIP[vipAddress], "MultiSender: address is already VIP");
        isVIP[vipAddress] = true;
        emit VIPAdded(vipAddress);
    }
    
    /**
     * @dev Remove VIP address (owner only)
     * @param vipAddress Address to remove from VIP
     */
    function removeVIP(address vipAddress) external onlyOwner {
        require(isVIP[vipAddress], "MultiSender: address is not VIP");
        isVIP[vipAddress] = false;
        emit VIPRemoved(vipAddress);
    }
    
    /**
     * @dev Check if address is VIP
     * @param addressToCheck Address to check
     */
    function checkVIP(address addressToCheck) external view returns (bool) {
        return isVIP[addressToCheck];
    }
}
