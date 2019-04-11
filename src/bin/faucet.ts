#!/usr/bin/env node

import faucet from 'commander';

import CommandLineInteraction from '../Interaction/CommandLineInteraction';
import Server from '../Server';
import { version } from '../../package.json';
import Logger from '../Logger';

const DEFAULT_PORT = 80;

faucet
  .version(version)
  .description('Mosaic faucet for base coins and EIP20 tokens.')
  .arguments('<chains...>')
  .option('-p, --port <port>', 'the port where the server listens on', parseInt)
  .action(
    async (chains: string[], command) => {
      if (command.port === undefined) {
        command.port = DEFAULT_PORT;
      }

      const interaction = new CommandLineInteraction();

      try {
        const server: Server = new Server(command.port, chains, interaction);
        server.run();
      } catch (error) {
        Logger.error(error.toString());
        process.exit(1);
      }
    }
  )
  .parse(process.argv);
