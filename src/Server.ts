import * as http from 'http';
import * as Web3 from 'web3';

import Account from './Account';
import CommandLineInteraction from './Interaction/CommandLineInteraction';
import EthNode from './EthNode';
import Faucet from './Faucet/Faucet';
import FaucetFactory from './Faucet/FaucetFactory';
import Logger from './Logger';

interface Faucets {
  [chain: string]: Faucet;
}

/**
 * An HTTP server that sends value on ethereum blockchains upon HTTP requests.
 * Can attach to multiple chains simultaneously. To request a filling from the faucet to an account,
 * send an HTTP post request to it, where the body must be '{"beneficiary":"0xaddress@chainId"}'.
 * The chain id identifies for the server on which chain to send value.
 */
export default class Server {
  private port: number;
  private faucets: Faucets = {};

  /**
   * @param port The server will listen for incoming requests on this port.
   */
  constructor(port: number) {
    this.port = port;
  }

  /**
   * Starts the HTTP server.
   */
  public async run(chains: string[]): Promise<any> {
    if (chains.length === 0) {
      Logger.error('No chain provided, server can only start with at least one faucet.');
      process.exit(1);
    }
    await this.initializeFaucets(chains);

    Logger.info('Starting server.');
    const server = http.createServer(this.requestHandler.bind(this))

    return server.listen(this.port, () => {
      Logger.info(`Server is listening on ${this.port}.`);
      for (const chain of chains) {
        Logger.info(`Running faucet ${this.faucets[chain].address} on chain ${chain}.`);
      }
    })
  }

  /**
   * Starts new ethereum node connections, one per chain, and sets up the faucets.
   * @param chains The chains for which to provide faucets, as identified in the configuration.
   */
  private async initializeFaucets(chains: string[]): Promise<any> {
    Logger.info('Initializing faucets.');
    for (const chain of chains) {
      Logger.info(`Initializing faucet on chain ${chain}`);

      const web3: Web3 = new Web3();
      const interaction = new CommandLineInteraction();

      const account: Account = new Account(
        web3,
        chain,
        interaction,
      );

      if (!account.isInConfig()) {
        Logger.info(`No Web3 account found for chain ${chain}.`);
        const newPassword: string = await interaction.inquireNewPassword()
        account.addNewToConfig(newPassword);
      }

      Logger.info(`Requiring password for account on chain ${chain}`);
      const password = await interaction.inquirePassword();
      account.unlock(password);

      const ethNode: EthNode = new EthNode(account, chain);
      ethNode.start();

      const faucet: Faucet = FaucetFactory.build(ethNode, chain);

      this.faucets[chain] = faucet;
    }
  }

  /**
   * Handles all incoming requests. Tries to send value with a faucet of a chain.
   * @param request Incoming request message.
   * @param response Writing a response to the client.
   */
  private requestHandler(request: http.IncomingMessage, response: http.ServerResponse): void {
    const self = this;
    const body = [];
    request.on('data', function (chunk) {
      body.push(chunk);
    }).on('end', function () {
      const stringBody = Buffer.concat(body).toString();
      if (!stringBody) {
        Logger.info(`Invalid request body: ${stringBody}`);
        response.statusCode = 400;
        response.end(
          JSON.stringify(
            { error: 'Could not read body. You must pass {"beneficiary": "0xaddress@chainId"}' }
          )
        );
        return;
      }

      const parsedBody = JSON.parse(stringBody);
      const [address, chain] = parsedBody.beneficiary.split('@');
      if (!address || !chain) {
        Logger.info(`Invalid request body: ${stringBody}`);
        response.statusCode = 400;
        response.end(
          JSON.stringify(
            { error: 'Could not read body. You must pass {"beneficiary": "0xaddress@chainId"}' }
          )
        );
        return;
      }

      const faucet: Faucet = self.faucets[chain];
      if (faucet === undefined) {
        Logger.info(`Invalid request body: ${stringBody}`);
        response.statusCode = 400;
        response.end(JSON.stringify({ error: `No faucet running for chain ${chain}` }));
        return;
      }

      try {
        faucet.fill(address)
          .on(
            'transactionHash',
            txHash => response.end(JSON.stringify({ txHash })),
          )
          .on(
            'error',
            (error) => {
              Logger.error(`Could not fill address from faucet ${faucet.chain}: ${error.toString()}`);
              response.statusCode = 500;
              response.end(
                JSON.stringify(
                  { error: 'Could not fill address', details: error.toString() }
                )
              );
            }
          );
      } catch (error) {
        Logger.error(`Could not fill address from faucet ${faucet.chain}: ${error.toString()}`);
        response.statusCode = 500;
        response.end(
          JSON.stringify(
            { error: 'Could not fill address', details: error.toString() }
          )
        );
        return;
      }
    });
  }
}
