# 🚀 MultiSender 스마트 컨트랙트

> 효율적이고 안전한 다중 토큰 전송 솔루션

MultiSender는 이더리움 네트워크에서 네이티브 토큰(ETH)과 ERC20 토큰을 여러 주소에 동시에 전송할 수 있는 스마트 컨트랙트입니다. 가스 비용을 절약하고 전송 과정을 간소화하는 것을 목표로 합니다.

## ✨ 주요 기능

### 🪙 멀티 토큰 전송

- **네이티브 토큰 (ETH)**: 여러 주소에 ETH를 한 번에 전송
- **ERC20 토큰**: 표준 ERC20 토큰을 여러 주소에 배치 전송
- **최대 200개 주소**까지 동시 전송 지원

### 💰 수수료 시스템

- **기본 수수료**: 0.1% (10/10000)
- **최대 수수료**: 1% (100/10000)
- **VIP 면제**: VIP 사용자는 수수료 면제
- **자동 계산**: 전송 금액에 비례한 수수료 자동 계산

### 🛡️ 보안 기능

- **ReentrancyGuard**: 재진입 공격 방지
- **Ownable**: 관리자 권한 제어
- **입력값 검증**: 모든 입력값에 대한 엄격한 유효성 검사
- **비상 회수**: 관리자가 토큰을 회수할 수 있는 기능

### 👑 VIP 시스템

- VIP 사용자는 수수료 면제
- 관리자가 VIP 주소 추가/제거 가능
- VIP 상태 실시간 확인 가능

## 📁 프로젝트 구조

```
multisender-contract/
├── contracts/
│   ├── multisender/
│   │   ├── MultiSender.sol      # 메인 컨트랙트
│   │   ├── IERC20.sol          # ERC20 인터페이스
│   │   ├── Ownable.sol         # 소유권 관리
│   │   ├── ReentrancyGuard.sol # 재진입 방지
│   │   └── Context.sol         # 컨텍스트 유틸리티
│   ├── MockERC20.sol           # 테스트용 ERC20 토큰
│   └── Lock.sol                # 기존 Lock 컨트랙트
├── test/
│   ├── MultiSender.js          # MultiSender 테스트
│   └── Lock.js                 # Lock 테스트
├── ignition/
│   └── modules/
│       ├── MultiSender.js      # 배포 스크립트
│       └── Lock.js             # Lock 배포 스크립트
├── hardhat.config.js           # Hardhat 설정
└── package.json                # 의존성 관리
```

## 🚀 빠른 시작

### 1. 설치

```bash
# 저장소 클론
git clone <repository-url>
cd multisender-contract

# 의존성 설치
npm install
```

### 2. 컴파일

```bash
npx hardhat compile
```

### 3. 테스트

```bash
# 모든 테스트 실행
npx hardhat test

# 특정 테스트 파일 실행
npx hardhat test test/MultiSender.js

# 가스 사용량 리포트와 함께 테스트
REPORT_GAS=true npx hardhat test
```

### 4. 배포

```bash
# 로컬 네트워크에 배포
npx hardhat ignition deploy ./ignition/modules/MultiSender.js --network localhost

# 테스트넷에 배포
npx hardhat ignition deploy ./ignition/modules/MultiSender.js --network sepolia
```

## 📖 사용법

### 네이티브 토큰 (ETH) 전송

```solidity
// 여러 주소에 ETH 전송
address[] memory recipients = [addr1, addr2, addr3];
uint256[] memory amounts = [1 ether, 2 ether, 3 ether];

// 수수료 계산
uint256 totalAmount = 6 ether;
uint256 fee = multiSender.calculateFee(totalAmount);
uint256 requiredAmount = totalAmount + fee;

// 전송 실행
multiSender.sendNativeTokens{value: requiredAmount}(recipients, amounts);
```

### ERC20 토큰 전송

```solidity
// 토큰 승인
IERC20 token = IERC20(tokenAddress);
uint256 totalAmount = 600 * 10**18;
uint256 fee = multiSender.calculateFee(totalAmount);
uint256 requiredAmount = totalAmount + fee;

token.approve(multiSenderAddress, requiredAmount);

// 토큰 전송
address[] memory recipients = [addr1, addr2, addr3];
uint256[] memory amounts = [100 * 10**18, 200 * 10**18, 300 * 10**18];

multiSender.sendERC20Tokens(tokenAddress, recipients, amounts);
```

### VIP 관리 (관리자만)

```solidity
// VIP 추가
multiSender.addVIP(vipAddress);

// VIP 제거
multiSender.removeVIP(vipAddress);

// VIP 상태 확인
bool isVIP = multiSender.checkVIP(addressToCheck);
```

## 🔧 관리자 기능

### 수수료 설정

```solidity
// 수수료 비율 변경 (0.1% = 10, 1% = 100)
multiSender.setFeePercentage(50); // 0.5%

// 수수료 수집자 변경
multiSender.setFeeCollector(newCollectorAddress);
```

### 비상 회수

```solidity
// ETH 회수
multiSender.emergencyWithdraw(address(0), amount);

// ERC20 토큰 회수
multiSender.emergencyWithdraw(tokenAddress, amount);
```

## 📊 이벤트

```solidity
// 네이티브 토큰 전송 이벤트
event NativeTokensSent(
    address indexed sender,
    uint256 totalAmount,
    uint256 recipientCount
);

// ERC20 토큰 전송 이벤트
event ERC20TokensSent(
    address indexed token,
    address indexed sender,
    uint256 totalAmount,
    uint256 recipientCount
);

// 비상 회수 이벤트
event EmergencyWithdraw(address indexed token, uint256 amount);

// VIP 관리 이벤트
event VIPAdded(address indexed vipAddress);
event VIPRemoved(address indexed vipAddress);
```

## ⛽ 가스 사용량

| 함수               | 가스 사용량 | 설명               |
| ------------------ | ----------- | ------------------ |
| `MultiSender` 배포 | ~2,278,403  | 컨트랙트 배포      |
| `sendNativeTokens` | ~77,413     | 3개 주소 전송      |
| `sendERC20Tokens`  | ~88,512     | 2개 주소 전송      |
| `setFeePercentage` | ~28,958     | 수수료 비율 변경   |
| `setFeeCollector`  | ~29,275     | 수수료 수집자 변경 |
| `addVIP`           | ~45,123     | VIP 추가           |
| `removeVIP`        | ~28,456     | VIP 제거           |

## 🧪 테스트 커버리지

프로젝트는 포괄적인 테스트를 포함합니다:

- ✅ 네이티브 토큰 전송 테스트
- ✅ ERC20 토큰 전송 테스트
- ✅ 수수료 계산 테스트
- ✅ VIP 시스템 테스트
- ✅ 관리자 기능 테스트
- ✅ 에러 처리 테스트
- ✅ 보안 기능 테스트

## 🔒 보안 고려사항

### 1. 재진입 공격 방지

- `ReentrancyGuard`를 사용하여 재진입 공격을 방지합니다.

### 2. 권한 관리

- `Ownable` 패턴을 사용하여 관리자 권한을 제어합니다.

### 3. 입력값 검증

- 모든 입력값에 대한 엄격한 유효성 검사를 수행합니다.

### 4. 가스 최적화

- 배치 전송을 통해 가스 비용을 절약합니다.

### 5. 비상 회수

- 관리자가 토큰을 회수할 수 있는 기능을 제공합니다.

## 🛠️ 개발 환경

- **Solidity**: ^0.8.28
- **Hardhat**: ^2.26.3
- **Ethers.js**: ^6.15.0
- **OpenZeppelin**: ^5.4.0

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ 주의사항

- 이 컨트랙트는 테스트 환경에서 검증되었습니다
- 메인넷 배포 전 충분한 감사를 받으시기 바랍니다
- 수수료 설정은 신중하게 결정하세요
- VIP 관리 시 보안을 고려하세요

## 📞 지원

버그 리포트나 기능 제안은 [Issues](https://github.com/your-repo/issues)를 통해 등록해 주세요.

---

**MultiSender**로 효율적이고 안전한 토큰 전송을 경험해보세요! 🚀
