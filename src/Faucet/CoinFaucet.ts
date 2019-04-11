import config from 'config';
import { TransactionConfig } from 'web3-core';

import Account from '../Account';
import Faucet from "./Faucet";
import Logger from '../Logger';

/**
 * A CoinFaucet sends value in the form of blockchain base coins directly from its address.
 */
export default class CoinFaucet implements Faucet {
  /** The amount to transfer with every fill request. */
  readonly amount: string;

  /**
   * @param account The faucet will use this account to fill other accounts.
   * @param chain The identifier of the chain that this faucet uses.
   */
  constructor(readonly account: Account, readonly chain: string) {
    const amountConfigAccessor = `Chains.${chain}.Funds.Amount`;
    if (!config.has(amountConfigAccessor)) {
      throw new Error(`Missing config key ${amountConfigAccessor}!`);
    }

    this.amount = config.get(amountConfigAccessor);
  }

  /**
   * Sends value to the given address.
   * @param address The beneficiary.
   * @returns The transaction hash wrapped in a promise.
   */
  public fill(address: string): Promise<string> {
    Logger.info('sending coins', { chain: this.chain, amount: this.amount, toWhom: address });
    const transactionHashPromise: Promise<string> = this.sendTransaction(address);

    transactionHashPromise.then(
      txHash => Logger.info('sent coins', { chain: this.chain, amount: this.amount, toWhom: address, txHash }),
    );

    return transactionHashPromise;
  }

  /**
   * Sends the actual transaction using the account.
   * Prepares the transaction with nonce and gas.
   * @param address The beneficiary.
   * @returns The transaction hash wrapped in a promise.
   */
  private async sendTransaction(address: string): Promise<string> {
    const transaction: TransactionConfig = {
      to: address,
      value: this.amount,
      from: this.account.address,
    };
    transaction.nonce = await this.account.getNonce();
    transaction.gas = await this.account.web3.eth.estimateGas(transaction);

    // Wrapping the event emitter in a promise to resolve or reject immediately when the events are
    // emitted and not wait for the transaction PromiEvent to resolve, which would only resolve
    // after the transaction had been mined.
    return new Promise(
      (resolve, reject) => {
        this.account.web3.eth.sendTransaction(transaction)
          .on('transactionHash', resolve)
          .on('error', reject);
      }
    );
  }
}
