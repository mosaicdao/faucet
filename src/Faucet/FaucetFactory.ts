import * as config from 'config';

import Faucet from "./Faucet";
import CoinFaucet from "./CoinFaucet";
import EIP20Faucet from "./EIP20Faucet";
import EthNode from "../EthNode";
import Logger from '../Logger';

/**
 * Builds faucets based on the chain configuration.
 */
export default class FaucetFactory {
  /**
   * Builds a new faucet based on the chain and connects it to the given ethereum node.
   * @param ethNode An ethereum node connection.
   * @param chain Which chain to build a faucet for.
   */
  public static build(ethNode: EthNode, chain: string): Faucet {
    const typeConfigAccessor: string = `Chains.${chain}.Funds.Type`;
    if (!config.has(typeConfigAccessor)) {
      Logger.error(`Config is missing key ${typeConfigAccessor}.`);
      process.exit(1);
    }

    const faucetType: string = config.get(typeConfigAccessor);

    switch (faucetType) {
      case 'EIP20':
        Logger.info(`New EIP20Faucet at ${ethNode.account.address} on chain ${chain}.`);
        return new EIP20Faucet(ethNode, chain);
      case 'Coin':
        Logger.info(`New CoinFaucet at ${ethNode.account.address} on chain ${chain}.`);
        return new CoinFaucet(ethNode, chain);
      default:
        Logger.error(`Unknown faucet type from config: ${faucetType}.`);
        process.exit(1);
    }
  }
}
