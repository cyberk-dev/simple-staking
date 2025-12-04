# SimpleStaking Contract

This project contains a `SimpleStaking` smart contract that allows users to stake ERC20 tokens and earn rewards over time.

## Overview

The `SimpleStaking` contract is designed to distribute a fixed number of reward tokens per second to all stakers, proportional to their staked amount. It is a common pattern used in yield farming and liquidity mining protocols.

## Reward Accumulation Formula

The core of the reward distribution mechanism is the `accRewardPerShare` variable, which stands for "accumulated rewards per share". A "share" is equivalent to one unit of the staked token (with precision). This variable keeps track of the total rewards that have been allocated per staked token since the beginning of the staking period.

The formula to update `accRewardPerShare` is triggered within the `invalidate()` function, which is called before any major state change (like staking, unstaking, or harvesting).

The formula is as follows:

```solidity
uint256 timeDiff = block.timestamp - lastRewardTime;
uint256 rewardAmount = timeDiff * rewardPerSecond;
accRewardPerShare += (rewardAmount * PRECISION) / totalAmount;
```

Where:

- `timeDiff`: The number of seconds that have passed since the last time rewards were updated.
- `rewardPerSecond`: The number of reward tokens distributed per second. This is a configurable value.
- `rewardAmount`: The total number of new reward tokens to be distributed in the current period.
- `totalAmount`: The total amount of tokens staked in the contract by all users.
- `PRECISION`: A constant (1e12) used to scale up the reward-per-share value. Since `rewardAmount` is often smaller than `totalAmount`, `(rewardAmount / totalAmount)` would be a fraction less than 1. As Solidity does not support floating-point numbers, this would result in 0. Multiplying by `PRECISION` before the division ensures that we can maintain precision for this fractional value.

Essentially, the new rewards are divided by the total staked amount to determine the reward per share for the elapsed time, and this value is added to `accRewardPerShare`.

### User Reward Calculation

When a user wants to know their pending rewards, the contract calculates it using their staked amount and the `accRewardPerShare`.

```solidity
uint256 pendingAmount = user.amount.mulDiv(accRewardPerShare, PRECISION) - user.rewardDebt;
```

- `user.amount`: The amount of tokens the user has staked.
- `user.rewardDebt`: This variable stores the value of `user.amount * accRewardPerShare / PRECISION` from the last time the user's rewards were updated. It represents the rewards that have already been accounted for.

By subtracting the `rewardDebt` from the user's potential total rewards, we get the pending rewards they have earned since their last interaction with the contract.

## Core Functions

- `stake(uint256 _amount)`: Allows a user to deposit (stake) tokens.
- `unstake(uint256 _amount)`: Allows a user to withdraw their staked tokens.
- `harvest()`: Allows a user to claim their accumulated rewards.
- `getRewardAmount(address _user)`: A view function to check the pending rewards for a user.

## Admin Functions

- `setRewardPerSecond(uint256 _rewardPerSecond)`: Allows the contract owner to update the rate of reward distribution.

This should give you a good starting point for your `README.md`. Let me know if you'd like me to add more sections or go into more detail on any of these points!
