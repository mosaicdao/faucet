export default interface Faucet {
  chain: string;

  /**
   * The address of this faucet.
   */
  address: string;

  /**
   * Sends value to the given address.
   * @param address The address of the recipient of the value.
   * @returns A Web3 PromiEvent.
   */
  fill(address: string): any;
}
