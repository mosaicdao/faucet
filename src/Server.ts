import config from 'config';
import http from 'http';
import Web3 from 'web3';

import { WebsocketProvider, AbstractSocketProvider } from 'web3-providers';

import Account from './Account';
import Faucet from './Faucet/Faucet';
import FaucetFactory from './Faucet/FaucetFactory';
import Interaction from './Interaction';
import Logger from './Logger';
import ServerError from './ServerError';
import EnoughFundException from './Faucet/EnoughFundException';

import HttpStatus = require('http-status-codes');

/** A map of chain Ids to their respective faucet. */
interface Faucets {
  [chain: string]: Faucet;
}

/** A map of chain Ids to their respective password. */
interface Passwords {
  [chain: string]: string;
}

/**
 * An HTTP server that sends value on ethereum blockchains upon HTTP requests.
 * Can attach to multiple chains simultaneously. To request a filling from the faucet to an account,
 * send an HTTP post request to it, where the body must be '{"beneficiary":"0xaddress@chainId"}'.
 * The chain id identifies for the server on which chain to send value.
 */
export default class Server {
  /** All the faucets that this server runs. */
  private faucets: Faucets = {};

  /** The account passwords of the accounts that the faucets use. */
  private passwords: Passwords = {};

  /** The HTTP port where the server listens. */
  private port: number;

  /** A list of all chain Ids that will have faucets. */
  private chains: string[];

  /** Used to get passwords to unlock chain accounts. */
  private interaction: Interaction;

  /**
   * @param port The server will listen for incoming requests on this port.
   * @param chains A list of chains to start faucets for. Starts one faucet per chain based on the
   *     configuration.
   * @param interaction An interaction instance to retrieve passwords.
   */
  public constructor(port: number, chains: string[], interaction: Interaction) {
    if (chains.length === 0) {
      throw new Error('No chain provided, server can only start with at least one faucet.');
    }

    this.port = port;
    this.chains = chains;
    this.interaction = interaction;
  }

  /**
   * Starts the HTTP server.
   */
  public async run(): Promise<http.Server> {
    this.passwords = await this.readPasswords();
    this.faucets = await this.initializeFaucets();

    Logger.info('starting server');
    const server = http.createServer(this.requestHandler.bind(this));

    return server.listen(this.port, (): void => {
      for (const chain of this.chains) {
        Logger.info('running faucet', { chain, address: this.faucets[chain].account.address });
      }

      Logger.info('server is listening', { port: this.port });
    });
  }

  /**
   * Starts new ethereum node connections, one per chain, and sets up the faucets.
   * @returns The faucets wrapped in a Promise.
   */
  private async initializeFaucets(): Promise<Faucets> {
    Logger.info('initializing faucets');
    const faucets: Faucets = {};
    for (const chain of this.chains) {
      Logger.info('initializing faucet', { chain });
      const web3: Web3 = Server.getWeb3(chain);

      const account: Account = new Account(
        web3,
        chain,
      );

      if (!account.isInConfig()) {
        Logger.info('no Web3 account found', { chain });
        const newPassword: string = await this.interaction.inquireNewPassword();
        account.addNewToConfig(newPassword);
      }

      const password: string = this.passwords[chain];
      if (!password) {
        throw new Error(`Trying to start faucet without password on chain ${chain}`);
      }
      account.unlock(password);

      const faucet: Faucet = FaucetFactory.build(account, chain);

      faucets[chain] = faucet;
    }

    return faucets;
  }

  /**
   * Handles all incoming requests. Tries to send value with a faucet of a chain.
   * @param request Incoming request message.
   * @param response Writing a response to the client.
   */
  private async requestHandler(
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): Promise<void> {
    let body: Uint8Array[];

    /* Allow cross origin request, this is needed to build an UI on top of faucet */
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST, GET');
    response.setHeader('Access-Control-Allow-Headers', '*');

    try {
      body = await Server.readBody(request);
    } catch (error) {
      Logger.warn('invalid request', { reason: 'could not read body', error: error.toString() });
      return Server.returnError(
        response,
        new ServerError('Could not read body. You must pass {"beneficiary": "0xaddress@chainId"}', HttpStatus.BAD_REQUEST),
      );
    }

    const stringBody: string = Buffer.concat(body).toString();
    if (!stringBody) {
      Logger.warn('invalid request', { reason: 'could not read body', body: stringBody });
      return Server.returnError(
        response,
        new ServerError('Could not read body. You must pass {"beneficiary": "0xaddress@chainId"}', HttpStatus.BAD_REQUEST),
      );
    }

    const parsedBody = JSON.parse(stringBody);
    const [address, chain] = parsedBody.beneficiary.split('@');
    if (!address || !chain) {
      Logger.warn('invalid request', { reason: 'address or chain missing', body: stringBody });
      return Server.returnError(
        response,
        new ServerError('Could not read body. You must pass {"beneficiary": "0xaddress@chainId"}', HttpStatus.BAD_REQUEST),
      );
    }

    const faucet: Faucet = this.faucets[chain];
    if (faucet === undefined) {
      Logger.warn('invalid request', { reason: 'no faucet for chain', body: stringBody });
      return Server.returnError(
        response,
        new ServerError(`No faucet running for chain ${chain}`, HttpStatus.BAD_REQUEST),
      );
    }

    try {
      const txHash = await faucet.fill(address);
      response.end(JSON.stringify({ txHash }));
    } catch (error) {
      Logger.error('could not fill address', { chain: faucet.chain, error: error.toString() });

      if (!(error instanceof EnoughFundException)) {
        return Server.returnError(
          response,
          new ServerError('Server error. Could not fill address.', HttpStatus.INTERNAL_SERVER_ERROR),
        );
      }
      return Server.returnError(
        response,
        new ServerError(`${error.toString()}`, HttpStatus.UNPROCESSABLE_ENTITY),
      );
    }
  }

  /**
   * Reads and returns the body from a request.
   * @param request The request from which to read the body.
   * @returns The body buffer, wrapped in a promise.
   */
  private static readBody(request: http.IncomingMessage): Promise<Uint8Array[]> {
    return new Promise((resolve, reject) => {
      const body = [];
      request.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        resolve(body);
      }).on('error', reject);
    });
  }

  /**
   * Reads and returns the passwords for all chains.
   * @returns The passwords, wrapped in a promise.
   */
  private async readPasswords(): Promise<Passwords> {
    const passwords: Passwords = {};
    for (const chain of this.chains) {
      Logger.info('requiring password to unlock account account', { chain });
      const password = await this.interaction.inquirePassword(chain);

      passwords[chain] = password;
    }

    return passwords;
  }

  /**
   * Builds a Web3 instance that points to a node of the given chain.
   * @param chain The chain identifier of the chain that this web3 should connect to.
   * @returns The Web3 instance.
   */
  private static getWeb3(chain: string): Web3 {
    const websocketConfigAccessor: string = `Chains.${chain}.WebSocket`;
    if (!config.has(websocketConfigAccessor)) {
      throw new Error(`Missing config key ${websocketConfigAccessor}!`);
    }
    const host: string = config.get(websocketConfigAccessor);
    const provider: AbstractSocketProvider = new WebsocketProvider(host);
    const web3: Web3 = new Web3(provider);

    return web3;
  }

  /**
   * Returns the given error as the given response.
   * @param response The server response that should respond with the error.
   * @param error The error that the response should be.
   */
  private static returnError(response: http.ServerResponse, error: ServerError): void {
    response.statusCode = error.code;
    response.end(
      JSON.stringify({ error: error.message }),
    );
  }
}
