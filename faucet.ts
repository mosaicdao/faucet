#!/usr/bin/env node

'use strict';

import * as faucet from 'commander';

import Server from './src/Server';

import { version } from './package.json';

faucet
  .version(version)
  .description('Mosaic faucet for base coins and EIP20 tokens.')
  .action(
    () => {
      const server: Server = new Server();
      server.run();
    }
  )
  .parse(process.argv);
