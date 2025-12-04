import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { network, tasks } from 'hardhat';
import { NetworkConnection } from 'hardhat/types/network';
import { parseEther } from 'viem';

import SimpleStakingModule from '../ignition/modules/SimpleStaking.js';

const DAY_IN_SECONDS = 86400;

async function deploy(connection: NetworkConnection) {
  const { viem, ignition, networkHelpers } = connection;
  const [deployer, ...users] = await viem.getWalletClients();
  const client = await viem.getPublicClient();
  const time = networkHelpers.time;

  const rewardPerSecond = 1;
  const startTime = (await time.latest()) + DAY_IN_SECONDS;

  const token = await viem.deployContract('Token', ['Token', 'TKN', parseEther('1000000000')]);

  const { simpleStaking } = await ignition.deploy(SimpleStakingModule, {
    parameters: {
      SimpleStakingModule: {
        token: token.address,
        rewardPerSecond,
        startTime,
      },
    },
  });

  await Promise.all(
    users.map(async (user) => {
      await token.write.transfer([user.account.address, 10000n]);
      await token.write.approve([simpleStaking.address, 10000n], { account: user.account });
    })
  );
  await token.write.transfer([simpleStaking.address, 100000000000n]);

  return {
    token,
    staking: simpleStaking,
    connection,
    viem,
    client,
    networkHelpers,
    rewardPerSecond,
    startTime,
    users,
    time,
  };
}

describe('SimpleStaking', async function () {
  it('Complex scenario', async function () {
    const { networkHelpers } = await network.connect();
    const { token, staking, connection, viem, client, rewardPerSecond, startTime, users, time } =
      await networkHelpers.loadFixture(deploy);

    // rewardPerSecond = 10
    // timline                           START_TIME       +10          +20          +30           +40          +50
    // user1_action             +1000                     claim(10)                               claim(13)
    // user1_(staked|rewarded)           (1000|0)         (1000|0)     (1000|4)     (1000|8)      (1000|13)
    // user2_action                                       +1500                     -500
    // user2_(staked|rewarded)           (0|0)            (1500|0)     (1500|6)     (1000,12)     (1000,17)

    const [user1, user2] = users;

    // BEFORE START_TIME
    await viem.assertions.erc20BalancesHaveChanged(
      staking.write.stake([1000n], { account: user1.account }),
      token.address,
      [
        { address: user1.account.address, amount: -1000n },
        { address: staking.address, amount: 1000n },
      ]
    );

    // AT START_TIME
    await time.increaseTo(startTime);
    assert.equal(await staking.read.getRewardAmount([user1.account.address]), 0n);

    // +10
    await time.increaseTo(startTime + 10);
    await staking.write.stake([1500n], { account: user2.account });
    await viem.assertions.erc20BalancesHaveChanged(
      staking.write.harvest({ account: user1.account }),
      token.address,
      [
        { address: user1.account.address, amount: 10n },
        { address: staking.address, amount: -10n },
      ],
      1n
    );

    // +20
    await time.increaseTo(startTime + 20);
    const [_20_u1r, _20_u2r] = await Promise.all([
      staking.read.getRewardAmount([user1.account.address]),
      staking.read.getRewardAmount([user2.account.address]),
    ]);
    assert.ok(absBn(_20_u1r - 4n) <= 1n);
    assert.ok(absBn(_20_u2r - 6n) <= 1n);

    // +30
    await time.increaseTo(startTime + 30);
    await staking.write.unstake([500n], { account: user2.account });
    const [_30_u1r, _30_u2r] = await Promise.all([
      staking.read.getRewardAmount([user1.account.address]),
      staking.read.getRewardAmount([user2.account.address]),
    ]);
    assert.ok(absBn(_30_u1r - 8n) <= 1n);
    assert.ok(absBn(_30_u2r - 12n) <= 1n);

    // +40
    await time.increaseTo(startTime + 40);
    await viem.assertions.erc20BalancesHaveChanged(
      staking.write.harvest({ account: user1.account }),
      token.address,
      [{ address: user1.account.address, amount: 13n }],
      1n
    );
    await viem.assertions.erc20BalancesHaveChanged(
      staking.write.harvest({ account: user2.account }),
      token.address,
      [{ address: user2.account.address, amount: 17n }],
      1n
    );
  });
});

function absBn(a: bigint): bigint {
  return a > 0n ? a : -a;
}
