import config from 'config';

import Account from '../Account'
import CoinFaucet from './CoinFaucet';
import EIP20Faucet from './EIP20Faucet';
import Faucet from './Faucet';
import Logger from '../Logger';

/**
 * Builds faucets based on the chain configuration.
 */
export default class FaucetFactory {
  /**
   * Builds a new faucet based on the chain and connects it to the given ethereum node.
   * @param account An ethereum node connection.
   * @param chain Which chain to build a faucet for.
   * @throws Error if the faucet cannot be created based on the configuration.
   */
  public static build(account: Account, chain: string): Faucet {
    const typeConfigAccessor: string = `Chains.${chain}.Funds.Type`;
    if (!config.has(typeConfigAccessor)) {
      throw new Error(`Config is missing key ${typeConfigAccessor}.`);
    }

    const faucetType: string = config.get(typeConfigAccessor);

    switch (faucetType) {
      case 'EIP20':
        Logger.info('new EIP20 faucet', { chain, address: account.address });
        return new EIP20Faucet(account, chain);
      case 'Coin':
        Logger.info('new coin faucet', { chain, address: account.address });
        return new CoinFaucet(account, chain);
      default:
        throw new Error(`Unknown faucet type from config: ${faucetType}.`);
    }
  }
}
