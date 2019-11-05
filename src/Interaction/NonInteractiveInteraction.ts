import fs from 'fs';

import Interaction from '../Interaction';
const ENV_ACCOUNT_PASSWORD_PREFIX = 'ENV_ACCOUNT_PASSW_';

/** A map of chain Ids to their respective password. */
interface Passwords {
  [chain: string]: string;
}

/**
 * Interaction implementation that stores passwords for chains and returns them.
 */
export default class NonInteractiveInteraction implements Interaction {
  private passwords: Passwords = {};

  /**
   * Will associate the given chains with the passwords in the given file.
   * The file must have one password per line. The number of passwords must be equal to the number
   * of chains. The passwords will be associated to the chains in the same order. The first chain
   * in the array will get the first pasword from the password file and so on.
   * @param chains The chains identifiers in an array.
   */
  public constructor(chains: string[]) {
    for (let index = 0; index < chains.length; index += 1) {
      const chain = chains[index];
      const account_password = process.env[`${ENV_ACCOUNT_PASSWORD_PREFIX}${chain}`];
      // Assigns the password to the chain on the field.
      if (account_password) {
        this.passwords[chain] = account_password;
      }
    }
    if (Object.keys(this.passwords).length !== chains.length) {
      throw new Error('Number of exported passwords does not match number of chains.');
    }
  }

  /**
   * Returns the stored password.
   */
  public async inquirePassword(chainId?: string): Promise<string> {
    if (!(chainId in this.passwords)) {
      throw new Error(`No password available for the given chain: ${chainId}.`);
    }
    return this.passwords[chainId];
  }

  /**
   * Returns the stored password.
   */
  public async inquireNewPassword(): Promise<string> {
    throw new Error('Cannot inquire new passwords non-interactively.');
  }
}
