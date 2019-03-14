import * as config from 'config';
import * as ProviderEngine from 'web3-provider-engine';
import * as Web3 from 'web3';

import Account from './Account';
import Logger from './Logger';
import ZeroClientProvider from './ZeroClientProvider';

/**
 * An EthNode handles the websocket connection to an ethereum node.
 */
export default class EthNode {
  public chain: string;
  public account: Account;
  public web3: Web3;

  private provider: ProviderEngine;
  private websocketConfigAccessor: string;

  /**
   * @param account This account will be used to sign transactions.
   * @param chain The identifier of the chain to connect to, must match the config entry.
   */
  constructor(account: Account, chain: string) {
    this.chain = chain;
    this.account = account;
    this.web3 = account.web3;

    this.websocketConfigAccessor = `Chains.${this.chain}.WebSocket`;
  }

  /**
   * Starts the connection to the ethereum node.
   */
  public start() {
    if (!config.has(this.websocketConfigAccessor)) {
      Logger.error(`Missing config key ${this.websocketConfigAccessor}!`);
      process.exit(1);
    }

    Logger.info(`Starting provider for chain ${this.chain}.`);
    const addresses = [this.account.address];
    const provider = ZeroClientProvider({
      rpcUrl: config.get(this.websocketConfigAccessor),
      getAccounts: callback => callback(null, addresses),
      signTransaction: (tx, cb) => {
        const extractRawTx = (error, response) => {
          cb(error, response.rawTransaction);
        };
        this.account.signTransaction(tx, extractRawTx);
      },
    });

    this.web3.setProvider(provider);
  }

  /**
   * Stops the connection to the ethereum node.
   */
  public stop() {
    this.provider.stop();
  }
}
