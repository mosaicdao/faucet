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

  private interaction: Interaction;
  private accountConfigAccessor: string;
  private web3Account: any;

  constructor(web3: Web3, chain: string, interaction: Interaction) {
    this.web3 = web3;
    this.chain = chain;
    this.interaction = interaction;
    this.accountConfigAccessor = `Chains.${this.chain}.Account`;
  }

  /**
   * Unlocks this account and keeps it in memory unlocked.
   * @param password The password required to unlock the keyVault.
   */
  public unlock(password: string): Promise<void> {
    if (!config.has(this.accountConfigAccessor)) {
      Logger.info('No Web3 account found.');
      return this.createNewWeb3Account();
    }

    Logger.info(`Unlocking account for chain ${this.chain}.`);
    const keyStore = config.get(this.accountConfigAccessor);

    this.web3Account = this.web3.eth.accounts.decrypt(keyStore, password);
  }

  public get address(): string {
    return this.web3Account.address;
  }

  public get privateKey(): string {
    return this.web3Account.privateKey;
  }

  public get signTransaction(): (tx, callback?) => void {
    return this.web3Account.signTransaction;
  }

  private async createNewWeb3Account(): Promise<any> {
    Logger.info(`Creating new account for chain ${this.chain}.`);
    const web3Account = this.web3.eth.accounts.create();
    const password: string = await this.interaction.inquireNewPassword()

    const encryptedAccount = this.web3.eth.accounts.encrypt(web3Account.privateKey, password);
    return this.updateConfigAccount(encryptedAccount);
  }

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
    Logger.warn('Process has to exit as it does not support dynamic configuration at runtime. Please restart.');
    process.exit(1);
  }

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
