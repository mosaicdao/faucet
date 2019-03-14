/*
 * 2019-03-05
 * Content taken from https://github.com/MetaMask/provider-engine under MIT license.
 * File content: https://github.com/MetaMask/provider-engine/blob/77a3b99b1312e2c381925e84c73181d26f1d4370/zero.js
 *
 * Slightly modified. Mainly removed other providers besides Websockets and removed Infura fallback.
 *
 * MIT License
 *
 * Copyright (c) 2018 MetaMask
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 */

import * as ProviderEngine from 'web3-provider-engine';
import * as DefaultFixture from 'web3-provider-engine/subproviders/default-fixture.js';
import * as NonceTrackerSubprovider from 'web3-provider-engine/subproviders/nonce-tracker.js';
import * as CacheSubprovider from 'web3-provider-engine/subproviders/cache.js';
import * as FilterSubprovider from 'web3-provider-engine/subproviders/filters.js';
import * as InflightCacheSubprovider from 'web3-provider-engine/subproviders/inflight-cache';
import * as HookedWalletSubprovider from 'web3-provider-engine/subproviders/hooked-wallet.js';
import * as SanitizingSubprovider from 'web3-provider-engine/subproviders/sanitizer.js';
import * as WebSocketSubprovider from 'web3-provider-engine/subproviders/websocket.js';

function createDataSubprovider(opts) {
  const { rpcUrl, debug, origin } = opts;

  return new WebSocketSubprovider({ rpcUrl, debug, origin });
}

export default function ZeroClientProvider(opts?: any): ProviderEngine {
  const engine = new ProviderEngine(opts.engineParams);

  // static
  const staticSubprovider = new DefaultFixture(opts.static);
  engine.addProvider(staticSubprovider);

  // nonce tracker
  engine.addProvider(new NonceTrackerSubprovider());

  // sanitization
  const sanitizer = new SanitizingSubprovider();
  engine.addProvider(sanitizer);

  // cache layer
  const cacheSubprovider = new CacheSubprovider();
  engine.addProvider(cacheSubprovider);

  const filterSubprovider = new FilterSubprovider();
  engine.addProvider(filterSubprovider);

  // inflight cache
  const inflightCache = new InflightCacheSubprovider();
  engine.addProvider(inflightCache);

  // id mgmt
  const idmgmtSubprovider = new HookedWalletSubprovider({
    // accounts
    getAccounts: opts.getAccounts,
    // transactions
    processTransaction: opts.processTransaction,
    approveTransaction: opts.approveTransaction,
    signTransaction: opts.signTransaction,
    publishTransaction: opts.publishTransaction,
    // messages
    // old eth_sign
    processMessage: opts.processMessage,
    approveMessage: opts.approveMessage,
    signMessage: opts.signMessage,
    // new personal_sign
    processPersonalMessage: opts.processPersonalMessage,
    processTypedMessage: opts.processTypedMessage,
    approvePersonalMessage: opts.approvePersonalMessage,
    approveTypedMessage: opts.approveTypedMessage,
    signPersonalMessage: opts.signPersonalMessage,
    signTypedMessage: opts.signTypedMessage,
    personalRecoverSigner: opts.personalRecoverSigner,
  });
  engine.addProvider(idmgmtSubprovider);

  // data source
  const dataSubprovider = opts.dataSubprovider || createDataSubprovider(opts);
  // for websockets, forward subscription events through provider
  dataSubprovider.on('data', (err, notification) => {
    engine.emit('data', err, notification);
  });
  engine.addProvider(dataSubprovider);

  // start polling
  if (!opts.stopped) {
    engine.start();
  }

  return engine;
}
