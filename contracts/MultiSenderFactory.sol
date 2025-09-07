// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./multisender/MultiSender.sol";

/**
 * @title MultiSenderFactory
 * @dev CREATE2를 사용하여 모든 체인에서 동일한 주소로 MultiSender를 배포하는 팩토리
 */
contract MultiSenderFactory {
    // 배포된 MultiSender 컨트랙트 주소들
    mapping(bytes32 => address) public deployedContracts;
    
    // 이벤트
    event MultiSenderDeployed(bytes32 indexed salt, address indexed contractAddress);
    
    /**
     * @dev CREATE2를 사용하여 MultiSender를 배포
     * @param salt 배포에 사용할 salt 값
     * @return contractAddress 배포된 컨트랙트 주소
     */
    function deployMultiSender(bytes32 salt) external returns (address contractAddress) {
        // 이미 배포된 경우 기존 주소 반환
        if (deployedContracts[salt] != address(0)) {
            return deployedContracts[salt];
        }
        
        // CREATE2로 MultiSender 배포
        bytes memory bytecode = abi.encodePacked(
            type(MultiSender).creationCode
        );
        
        assembly {
            contractAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        require(contractAddress != address(0), "MultiSenderFactory: deployment failed");
        
        // 배포된 주소 저장
        deployedContracts[salt] = contractAddress;
        
        emit MultiSenderDeployed(salt, contractAddress);
    }
    
    /**
     * @dev CREATE2를 사용하여 MultiSender 주소를 미리 계산
     * @param salt 배포에 사용할 salt 값
     * @return contractAddress 계산된 컨트랙트 주소
     */
    function computeMultiSenderAddress(bytes32 salt) external view returns (address contractAddress) {
        bytes memory bytecode = abi.encodePacked(
            type(MultiSender).creationCode
        );
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        
        contractAddress = address(uint160(uint256(hash)));
    }
    
    /**
     * @dev 특정 salt로 배포된 컨트랙트 주소 조회
     * @param salt 조회할 salt 값
     * @return contractAddress 배포된 컨트랙트 주소 (0이면 미배포)
     */
    function getDeployedContract(bytes32 salt) external view returns (address contractAddress) {
        return deployedContracts[salt];
    }
    
    /**
     * @dev 배포된 모든 컨트랙트 수 조회
     * @return count 배포된 컨트랙트 수
     */
    function getDeployedCount() external view returns (uint256 count) {
        // 이 함수는 gas 비용이 많이 들 수 있으므로 실제 사용 시 주의
        // 필요하다면 별도의 배열로 관리하는 것을 권장
        return 0; // 구현 생략
    }
}
