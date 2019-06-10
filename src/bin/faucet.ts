#!/usr/bin/env node

import faucet from 'commander';

import CommandLineInteraction from '../Interaction/CommandLineInteraction';
import Interaction from '../Interaction';
import NonInteractiveInteraction from '../Interaction/NonInteractiveInteraction';
import Server from '../Server';
import { version } from '../../package.json';
import Logger from '../Logger';

const DEFAULT_PORT = 80;

faucet
  .version(version)
  .description('Mosaic faucet for base coins and EIP20 tokens.')
  .arguments('<chains...>')
  .option('-p, --port <port>', 'the port where the server listens on', parseInt)
  .option('-n, --non-interactive <path>', 'run the faucet non-interactively')
  .action(
    async (chains: string[], command): Promise<void> => {
      const port = command.port === undefined ? DEFAULT_PORT : command.port;

      let interaction: Interaction;
      if (command.nonInteractive === undefined) {
        interaction = new CommandLineInteraction();
      } else {
        try {
          interaction = new NonInteractiveInteraction(chains, command.nonInteractive);
        } catch (error) {
          Logger.error(error.toString());
          process.exit(1);
        }
      }

      try {
        const server: Server = new Server(port, chains, interaction);
        await server.run();
      } catch (error) {
        Logger.error(error.toString());
        process.exit(1);
      }
    },
  )
  .parse(process.argv);
