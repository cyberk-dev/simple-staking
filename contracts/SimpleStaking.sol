// SPDX-License-Identifier: Momo
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract SimpleStaking is Ownable {
    using Math for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 1e12;

    IERC20 public token;
    uint256 public rewardPerSecond;
    uint256 public startTime;

    uint256 public totalAmount;
    uint256 public accRewardPerShare;
    uint256 public lastRewardTime;

    mapping(address => UserInfo) public userInfo;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 rewardAmount;
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Harvest(address indexed user, uint256 amount);
    event RewardPerSecondUpdated(uint256 rewardPerSecond);

    error InvalidAmount();
    error InsufficientStakedAmount();

    constructor(address _token, uint256 _rewardPerSecond, uint256 _startTime) Ownable(msg.sender) {
        token = IERC20(_token);
        rewardPerSecond = _rewardPerSecond;
        startTime = _startTime;
    }

    // View function to see pending Momos on frontend.
    function getRewardAmount(address _user) external view returns (uint256) {
        if (startTime > block.timestamp) {
            return 0;
        }
        UserInfo memory user = userInfo[_user];
        uint256 _accRewardPerShare = accRewardPerShare;
        uint256 _lastRewardTime = lastRewardTime < startTime ? startTime : lastRewardTime;
        if (block.timestamp > _lastRewardTime && totalAmount != 0) {
            uint256 timeDiff = block.timestamp - _lastRewardTime;
            uint256 rewardAmount = timeDiff * rewardPerSecond;
            _accRewardPerShare += (rewardAmount * PRECISION) / totalAmount;
        }

        uint256 pendingAmount = user.amount.mulDiv(_accRewardPerShare, PRECISION) - user.rewardDebt;
        return user.rewardAmount + pendingAmount;
    }

    function invalidate() public {
        if (block.timestamp <= lastRewardTime || startTime > block.timestamp) {
            return;
        }
        if (totalAmount == 0) {
            lastRewardTime = block.timestamp;
            return;
        }
        if (lastRewardTime < startTime) {
            lastRewardTime = startTime;
        }
        uint256 timeDiff = block.timestamp - lastRewardTime;
        uint256 rewardAmount = timeDiff * rewardPerSecond;
        accRewardPerShare += (rewardAmount * PRECISION) / totalAmount;
        lastRewardTime = block.timestamp;
    }

    function stake(uint256 _amount) external {
        if (_amount == 0) revert InvalidAmount();
        invalidate();

        UserInfo storage user = userInfo[msg.sender];

        // Update last reward
        uint256 pendingAmount = user.amount.mulDiv(accRewardPerShare, PRECISION) - user.rewardDebt;
        if (pendingAmount > 0) {
            user.rewardAmount += pendingAmount;
        }

        // Add LP
        totalAmount += _amount;
        user.amount += _amount;
        user.rewardDebt = user.amount.mulDiv(accRewardPerShare, PRECISION);

        token.transferFrom(address(msg.sender), address(this), _amount);

        emit Deposit(msg.sender, _amount);
    }

    // Withdraw LP tokens
    function unstake(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];

        if (_amount == 0) revert InvalidAmount();
        if (user.amount < _amount) revert InsufficientStakedAmount();

        invalidate();
        uint256 pendingAmount = user.amount.mulDiv(accRewardPerShare, PRECISION) - user.rewardDebt;
        if (pendingAmount > 0) {
            user.rewardAmount += pendingAmount;
        }

        user.amount -= _amount;
        totalAmount -= _amount;
        user.rewardDebt = user.amount.mulDiv(accRewardPerShare, PRECISION);
        emit Withdraw(msg.sender, _amount);
    }

    function harvest() external {
        invalidate();

        UserInfo storage user = userInfo[msg.sender];

        uint256 pendingAmount = user.amount.mulDiv(accRewardPerShare, PRECISION) - user.rewardDebt;
        pendingAmount = user.rewardAmount + pendingAmount;
        user.rewardAmount = 0;
        user.rewardDebt = user.amount.mulDiv(accRewardPerShare, PRECISION);

        if (pendingAmount > 0) {
            token.transfer(msg.sender, pendingAmount);
            emit Harvest(msg.sender, pendingAmount);
        }
    }

    // ADMIN functions
    function setRewardPerSecond(uint256 _rewardPerSecond) external onlyOwner {
        invalidate();
        rewardPerSecond = _rewardPerSecond;
        emit RewardPerSecondUpdated(_rewardPerSecond);
    }
}
