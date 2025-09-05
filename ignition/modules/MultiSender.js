const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MultiSenderModule", (m) => {
  const multiSender = m.contract("MultiSender");

  return { multiSender };
});
