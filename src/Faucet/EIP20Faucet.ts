import * as config from 'config';

import EthNode from "../EthNode";
import Faucet from "./Faucet";
import Logger from '../Logger';

import * as eip20Abi from '../../abi/EIP20Token.json';

/**
 * An EIP20 faucet sends value in the form of EIP20 tokens.
 */
export default class EIP20Faucet implements Faucet {
  public ethNode: EthNode;
  public chain: string;
  public eip20Address: string;

  private amount: number;
  private eip20Contract: any;

  constructor(ethNode: EthNode, chain: string) {
    this.ethNode = ethNode;
    this.chain = chain;

    const addressConfigAccessor = `Chains.${chain}.Funds.Address`;
    if (!config.has(addressConfigAccessor)) {
      Logger.error(`Missing config key ${addressConfigAccessor}!`);
      process.exit(1);
    }

    this.eip20Address = config.get(addressConfigAccessor);
    this.eip20Contract = new this.ethNode.web3.eth.Contract(eip20Abi, this.eip20Address);

    const amountConfigAccessor = `Chains.${chain}.Funds.Amount`;
    if (!config.has(amountConfigAccessor)) {
      Logger.error(`Missing config key ${amountConfigAccessor}!`);
      process.exit(1);
    }

    this.amount = config.get(amountConfigAccessor);
  }

  /**
   * Makes an EIP20 transfer to the given address.
   * @param address The beneficiary.
   */
  public fill(address: string): Promise<string> {
    Logger.info(`Sending ${this.amount} EIP20 tokens to ${address}.`);
    return this.eip20Contract.methods
      .transfer(address, this.amount.toString())
      .send({
        from: this.ethNode.account.address,
      })
      .then(
        (promiEvent) => {
          const txHash = promiEvent.transactionHash;
          Logger.info(`Sent ${this.amount} EIP20 tokens to ${address}. TxHash: ${txHash}`);

          return txHash;
        });
  }
}
