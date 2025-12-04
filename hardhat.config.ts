import hardhatToolboxViemPlugin from '@nomicfoundation/hardhat-toolbox-viem';
import hardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import hardhatViemAssertions from '@nomicfoundation/hardhat-viem-assertions';
import { configVariable, defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [
    hardhatToolboxViemPlugin,
    hardhatNetworkHelpers,
    hardhatViemAssertions,
    {
      id: 'hardhat-viem-assertions-extended',
      dependencies: () => [],
      hookHandlers: {
        network: () => import('./plugins/viem-test.js'),
      },
    },
  ],
  solidity: {
    npmFilesToBuild: [
      '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol',
      '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol',
    ],
    profiles: {
      default: {
        version: '0.8.28',
      },
      production: {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
    },
    hardhatOp: {
      type: 'edr-simulated',
      chainType: 'op',
    },
    sepolia: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('SEPOLIA_RPC_URL'),
      accounts: [configVariable('SEPOLIA_PRIVATE_KEY')],
    },
  },
});
