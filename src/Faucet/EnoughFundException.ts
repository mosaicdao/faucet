/**
 * This exception is thrown if beneficiary already has enough balance.
 */
export default class EnoughFundException extends Error {

  constructor() {
    super('Beneficiary already has enough balance.');
    this.name = 'EnoughFundException';
  }
}
