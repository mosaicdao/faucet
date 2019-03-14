#!/usr/bin/env node

'use strict';

import * as faucet from 'commander';

import Server from './src/Server';

import { version } from './package.json';


faucet
  .version(version)
  .description('Mosaic faucet for base coins and EIP20 tokens.')
  .arguments('<chains...>')
  .option('-p, --port <port>', 'the port where the server listens on', parseInt)
  .action(
    async (chains: string[], command) => {
      if (command.port === undefined) {
        command.port = 80;
      }

      const server: Server = new Server(command.port);
      server.run(chains);
    }
  )
  .parse(process.argv);
