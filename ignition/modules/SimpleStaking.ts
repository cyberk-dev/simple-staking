import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('SimpleStakingModule', (m) => {
  const token = m.getParameter('token');
  const rewardPerSecond = m.getParameter('rewardPerSecond');
  const startTime = m.getParameter('startTime');

  const simpleStaking = m.contract('SimpleStaking', [token, rewardPerSecond, startTime]);

  return { simpleStaking };
});
