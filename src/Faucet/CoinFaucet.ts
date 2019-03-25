import * as config from 'config';

import EthNode from "../EthNode";
import Faucet from "./Faucet";
import Logger from '../Logger';

/**
 * A CoinFaucet sends value in the form of blockchain base coins directly from its address.
 */
export default class CoinFaucet implements Faucet {
  public ethNode: EthNode;
  public chain: string;

  private amount: number;

  /**
   * @param ethNode The EthNode to use as a connection for filling accounts.
   * @param chain The identifier of the chain that this faucet uses.
   */
  constructor(ethNode: EthNode, chain: string) {
    this.ethNode = ethNode;
    this.chain = chain;

    const amountConfigAccessor = `Chains.${chain}.Funds.Amount`;
    if (!config.has(amountConfigAccessor)) {
      Logger.error(`Missing config key ${amountConfigAccessor}!`);
      process.exit(1);
    }

    this.amount = config.get(amountConfigAccessor);
  }

  /**
   * @returns The address of this faucet on the chain.
   */
  public get address(): string {
    return this.ethNode.account.address;
  }

  /**
   * Sends value to the given address.
   * @param address The beneficiary.
   * @returns A Web3 PromiEvent.
   */
  public fill(address: string): any {
    Logger.info(`Sending ${this.amount} coins to ${address}.`);
    return this.ethNode.web3.eth.sendTransaction({
      to: address,
      value: this.amount,
      from: this.ethNode.account.address,
    }).on(
      'transactionHash',
      txHash => Logger.info(`Sent ${this.amount} coins to ${address}. TxHash: ${txHash}`),
    );
  }
}
