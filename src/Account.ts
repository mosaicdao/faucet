import config from 'config';
import EthAccounts from 'web3-eth-accounts';
import fs from 'fs';
import Web3 from 'web3';

import Logger from './Logger';

/**
 * An account is a web3 account that is connected to a node and can send signed transactions,
 * signed with this account.
 */
export default class Account {
  /** Used to access the account in the config. */
  private accountConfigAccessor: string = `Chains.${this.chain}.Account`;
  /** A Web3 account that is used (unlocked) to sign transactions. */
  private web3Account: EthAccounts.Account;
  /**
   * The nonce of this account. Required to send transactions to the node.
   * If nonce is less than zero, we know we need to fetch it from the node.
   */
  private nonce: number = -1;

  /**
   * @param web3 The web3 instance that this account uses.
   * @param chain The identifier of the chain that this account is used on.
   */
  constructor(readonly web3: Web3, readonly chain: string) { }

  /**
   * The public address of this account.
   */
  public get address(): string {
    return this.web3Account.address;
  }

  /**
   * Returns true if this account is part of the configuration.
   */
  public isInConfig(): boolean {
    return config.has(this.accountConfigAccessor);
  }

  /**
   * Creates a new web3 account and adds it to the configuration.
   * Will exit the process as the config cannot be updated at runtime.
   * @param password The password that is used to encrypt the account.
   */
  public addNewToConfig(password: string): void {
    const web3Account = this.web3.eth.accounts.create();
    Logger.info('created new account', { chain: this.chain, account: web3Account.address });

    const encryptedAccount = this.web3.eth.accounts.encrypt(web3Account.privateKey, password);
    return this.updateConfigAccount(encryptedAccount);
  }

  /**
   * Unlocks this account and keeps it in memory unlocked.
   * @param password The password required to unlock the keyVault.
   */
  public unlock(password: string): void {
    Logger.info('unlocking account', { chain: this.chain });
    const keyStore = config.get(this.accountConfigAccessor);

    // Unlocking the account and adding it to the local web3 instance so that everything is signed
    // locally when using web3.eth.send
    this.web3Account = this.web3.eth.accounts.decrypt(keyStore, password);
    this.web3.eth.accounts.wallet.add(this.web3Account);
    Logger.info('unlocked account', { chain: this.chain, account: this.web3Account.address });
  }

  /**
   * Get the current nonce to send the next transaction with this account.
   * Takes pending transactions into account.
   * Once the nonce is gotten from the node, it is cached and increased by 1 for every transaction.
   * The node is only contacted on the first call to get the current nonce on the chain.
   * @returns The nonce wrapped in a Promise.
   */
  public async getNonce(): Promise<number> {
    if (this.nonce < 0) {
      this.nonce = await this.web3.eth.getTransactionCount(this.address, 'pending');
    } else {
      this.nonce++;
    }

    return this.nonce;
  }

  /**
   * Writes the account into the file that was read by the current config.
   * Exits the process afterwards!
   * @throws Error if it cannot update the configuration.
   */
  private updateConfigAccount(encryptedAccount: Object): void {
    const configObject: any = config.util.toObject(config);
    configObject['Chains'][this.chain]['Account'] = encryptedAccount;

    const configSource: string = this.getConfigSource();

    try {
      fs.accessSync(configSource, fs.constants.F_OK)
    } catch (error) {
      throw new Error(`Could not find config file to update: ${configSource}`);
    }

    fs.writeFileSync(
      configSource,
      JSON.stringify(configObject, null, '  '),
    );

    // Has to exit as config cannot be reloaded or updated at runtime:
    Logger.warn(
      'process has to exit as it does not support dynamic configuration at runtime; please restart.'
    );
    // Exit code 1 even though this is expected to signal to the user that they need to check what
    // happened.
    process.exit(1);
  }

  /**
   * Tries to identify which file the config was read from.
   * @returns The path to the config file. Or an empty string if not found.
   */
  private getConfigSource(): string {
    const sources = config.util.getConfigSources();
    for (const source of sources) {
      if (source.name.substring(source.name.length - 4) === 'json') {
        return source.name;
      }
    }

    return '';
  }
}
