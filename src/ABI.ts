import erc20Contract from 'openzeppelin-solidity/build/contracts/ERC20.json';
import { AbiItem } from "web3-utils";

/**
 * Represents required ABIs.
 */
export default class ABI {
  /**
   * @returns The ABI of a standard EIP20 token.
   */
  static get EIP20Token(): AbiItem[] {
    // Explicitly typing `abi` as `any`, as typing from json would not be accepted otherwise.
    const abi: any = erc20Contract.abi;

    return abi;
  }
}
