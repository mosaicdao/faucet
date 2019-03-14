export default interface Faucet {
  chain: string;

  /**
   * Sends value to the given address.
   * @param address The address of the recipient of the value.
   */
  fill(address: string): Promise<string>;
}
