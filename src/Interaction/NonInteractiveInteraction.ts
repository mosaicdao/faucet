import fs from 'fs';

import Interaction from '../Interaction';

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
   * @param passwordPath The path to the password file.
   */
  public constructor(chains: string[], passwordPath: string) {
    const passwords: string[] = NonInteractiveInteraction.readPasswords(passwordPath);
    if (passwords.length !== chains.length) {
      throw new Error('Number of passwords in file does not match number of chains.');
    }

    for (let index = 0; index < passwords.length; index += 1) {
      // Assigns the password to the chain on the field.
      this.passwords[chains[index]] = passwords[index];
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

  private static readPasswords(path: string): string[] {
    const passwordFile: string = fs.readFileSync(path, 'utf8');

    const passwords = passwordFile.split('\n');

    // Remove last empty element due to last line break:
    return passwords.filter((password: string): boolean => password.length > 0);
  }
}
