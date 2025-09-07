# MultiSender 다중 체인 배포 가이드

## 🎯 목표

CREATE2 팩토리 패턴을 사용하여 모든 체인에서 동일한 주소로 MultiSender 컨트랙트를 배포합니다.

## 📋 사전 준비

### 1. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# BSC 네트워크 설정
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here

# 다른 네트워크 설정 (선택사항)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io
```

### 2. BSC 테스트넷 BNB 준비

- [BSC 테스트넷 faucet](https://testnet.binance.org/faucet-smart)에서 테스트 BNB 받기
- 또는 [BSC 테스트넷 faucet 2](https://testnet.bnbchain.org/faucet-smart) 사용

## 🚀 배포 단계

### 1단계: BSC 테스트넷 배포

```bash
# BSC 테스트넷에 배포
npx hardhat run scripts/deploy-factory.js --network bscTestnet
```

### 2단계: BSC 메인넷 배포

```bash
# BSC 메인넷에 배포 (실제 BNB 필요)
npx hardhat run scripts/deploy-factory.js --network bsc
```

### 3단계: 다른 체인 배포

```bash
# 이더리움 메인넷
npx hardhat run scripts/deploy-factory.js --network ethereum

# 폴리곤
npx hardhat run scripts/deploy-factory.js --network polygon

# 아비트럼
npx hardhat run scripts/deploy-factory.js --network arbitrum

# 옵티미즘
npx hardhat run scripts/deploy-factory.js --network optimism
```

## 🔍 주소 확인

### 배포 전 주소 미리보기

```bash
# 주소 계산
npx hardhat run scripts/calculate-address.js
```

### 배포 후 검증

```bash
# 팩토리 테스트
npm run test:factory

# 전체 테스트
npx hardhat test
```

## 📊 예상 결과

모든 체인에서 동일한 주소가 생성됩니다:

```
Factory 주소: 0x[동일한주소]
MultiSender 주소: 0x[동일한주소]
Salt: 0x57dfa747a035cf6eee8a51ce7844ff65af06683bd3b89e7201cdf5e02114671c
```

## 🛠️ 네트워크 설정

### BSC 메인넷

- **Chain ID**: 56
- **RPC URL**: https://bsc-dataseed.binance.org
- **Gas Price**: 5 gwei
- **Explorer**: https://bscscan.com

### BSC 테스트넷

- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545
- **Gas Price**: 10 gwei
- **Explorer**: https://testnet.bscscan.com

## ⚠️ 주의사항

1. **Private Key 보안**: `.env` 파일을 절대 공개 저장소에 올리지 마세요
2. **Gas 비용**: 메인넷 배포 시 충분한 BNB를 준비하세요
3. **네트워크 확인**: 배포 전 네트워크 설정을 다시 한번 확인하세요
4. **배포 순서**: Factory를 먼저 배포한 후 MultiSender를 배포합니다

## 🔧 문제 해결

### 배포 실패 시

1. Gas limit 증가: `gasLimit: 5000000`
2. Gas price 조정: 네트워크 상황에 맞게 조정
3. RPC URL 변경: 다른 RPC 엔드포인트 사용

### 주소 불일치 시

1. Salt 값 확인: 동일한 salt 사용
2. Factory 주소 확인: 동일한 Factory 주소 사용
3. Bytecode 확인: 동일한 컨트랙트 코드 사용

## 📞 지원

문제가 발생하면 다음을 확인하세요:

- [Hardhat 문서](https://hardhat.org/docs)
- [BSC 문서](https://docs.bnbchain.org/)
- [CREATE2 문서](https://eips.ethereum.org/EIPS/eip-1014)
