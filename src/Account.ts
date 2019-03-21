import * as config from 'config';
import * as fs from 'fs';
import * as Web3 from 'web3';

import Interaction from './Interaction'
import Logger from './Logger';

/**
 * An account is a web3 public/private key pair.
 */
export default class Account {
  public chain: string;
  public web3: Web3;

  private accountConfigAccessor: string;
  private web3Account: any;

  /**
   * @param web3 The web3 instance that this account uses.
   * @param chain 
   * @param interaction 
   */
  constructor(web3: Web3, chain: string) {
    this.web3 = web3;
    this.chain = chain;
    this.accountConfigAccessor = `Chains.${this.chain}.Account`;
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
    Logger.info(`Created new account for chain ${this.chain}: ${web3Account.address}.`);

    const encryptedAccount = this.web3.eth.accounts.encrypt(web3Account.privateKey, password);
    return this.updateConfigAccount(encryptedAccount);
  }

  /**
   * Unlocks this account and keeps it in memory unlocked.
   * @param password The password required to unlock the keyVault.
   */
  public unlock(password: string): void {
    Logger.info(`Unlocking account for chain ${this.chain}.`);
    const keyStore = config.get(this.accountConfigAccessor);

    this.web3Account = this.web3.eth.accounts.decrypt(keyStore, password);
    Logger.info(`Unlocked account ${this.web3Account.address} on chain ${this.chain}.`);
  }

  /**
   * The public address of this account.
   */
  public get address(): string {
    return this.web3Account.address;
  }

  /**
   * The private key of this account.
   */
  public get privateKey(): string {
    return this.web3Account.privateKey;
  }

  /**
   * A function that signs a transaction. As per Web3 account.
   */
  public get signTransaction(): (tx, callback?) => void {
    return this.web3Account.signTransaction;
  }

  /**
   * Writes the account into the file that was read by the current config.
   */
  private updateConfigAccount(encryptedAccount: Object): void {
    const configObject: any = config.util.toObject(config);
    configObject['Chains'][this.chain]['Account'] = encryptedAccount;

    const configSource: string = this.getConfigSource();

    try {
      fs.accessSync(configSource, fs.constants.F_OK)
    } catch (error) {
      Logger.error(`Could not find config file to update: ${configSource}`);
      process.exit(1);
    }

    fs.writeFileSync(
      configSource,
      JSON.stringify(configObject, null, '  '),
    );

    // Has to exit as config cannot be reloaded or updated at runtime:
    Logger.warn(
      'Process has to exit as it does not support dynamic configuration at runtime. Please restart.'
    );
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
