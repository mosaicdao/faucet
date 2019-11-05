# 🚰 Mosaic Faucet

Mosaic Faucet is an ethereum faucet that supports multiple chains simultaneously.

## Using an Existing Faucet

Send an HTTP request to a running service that supports the chain that you want to get funded on.
Send a POST request like so:
```bash
curl -H "Content-Type: text/json" -d '{"beneficiary": "0x3e8880f88cf9a146a9d2c5001037d6d963224b8b@3"}' server:port
```

Note that the beneficiary is of the format `address@chain`.
`address` is the address of the beneficiary.
`chain` is the chain identifier.
In the example above, chain id `3` refers to ropsten.

The service can run in "coin" or "eip20" mode for a chain.
It can be different for different chains of the same service.
In "coin" mode, the faucet will send base coins of the chain to the beneficiary.
In "eip20" mode, the faucet will send a transaction to the configured EIP20 token to make a transfer to the beneficiary.

## Running a Faucet

First, copy `./config/default.json.dist` to `./config/default.json`.
You can override configuration with environment variables, on the command line, or with environment specific configuration files.
For more help see the [config package].

If your config does not include an account for a chain, faucet will ask you to provide a password for a new account.
Faucet will exit after it added a new account to the config, as the config cannot be updated at runtime.
You need to manually restart faucet until all accounts are available in the config.
Faucet will only check for accounts that you add as `chain` arguments, not for all configured chains.

Each chain in the config must have a `Funds` object, where `Type` can be `Coin` or `EIP20`.
If it is `EIP20`, it also requires an `Address`. The `Fund`'s `Amount` is sent per request.

`Coin` means it sends base coins.
`EIP20` means it makes a transaction to the EIP20Token at the given address to `transfer` tokens.

To start, run `./faucet <chains...>`.
Chains are identified by their chain id.
E.g. `./faucet 3 1407`.
For each chain, there must exist a configuration.
The default configuration is in `./config/default.json`.

Use the `--port` option to run the faucet at a different port than the default one.
`./faucet --port 8080 1407`

Use the `--non-interactive` option to run the faucet non-interactively. 
You must export ENV variables in below format
```
export ACCOUNT_ADDRESS_PASSW_{chainid}={account_password}
``` 
Example:
```
./faucet --non-interactive 1406 1407
```

Run `./faucet --help` for more help.

Mosaic faucet for base coins and EIP20 tokens.

1. Server initiates EthNode connections.
2. Server initiates Faucets with EthNodes.
3. Server accepts HTTP requests.
4. Server forwards to correct Faucet to fund address.
5. Faucet uses EthNode to send funds.

#### CORS

Mosaic faucet can be configured to use specific CORS settings. Default behavior allows all kinds of cross origin requests, it can be changed by updating environment variables. 

* `MOSAIC_FAUCET_CORS_ORIGIN`: Set allowed origin url.
* `MOSAIC_FAUCET_CORS_REQUEST_METHOD`: Set allowed request methods.
* `MOSAIC_FAUCET_CORS_ALLOW_METHOD`: Set allowed methods.
* `MOSAIC_FAUCET_CORS_ALLOW_HEADERS`: Set allowed headers. 



[config package]: https://www.npmjs.com/package/config
