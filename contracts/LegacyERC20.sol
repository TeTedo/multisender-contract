// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title LegacyERC20
 * @dev 옛날 ERC20 토큰 시뮬레이션 - transfer/transferFrom이 bool을 반환하지 않음
 */
contract LegacyERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
    
    // 옛날 ERC20: bool 반환값 없음
    function transfer(address to, uint256 value) external {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
    }
    
    // 옛날 ERC20: bool 반환값 없음
    function transferFrom(address from, address to, uint256 value) external {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
    }
    
    function approve(address spender, uint256 value) external {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
    }
}
