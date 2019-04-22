import Account from '../Account';

export default interface Faucet {
  /** The identifier of the chain. */
  chain: string;
  /** The amount to transfer with every fill request. */
  amount: string;

  /** The faucet will use this account to fill other accounts. */
  account: Account;

  /**
   * Sends value to the given address.
   * @param address The beneficiary.
   * @returns The transaction hash wrapped in a promise.
   */
  fill(address: string): Promise<string>;
}
