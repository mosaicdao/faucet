export default interface Interaction {
  /**
   * Returns a password.
   */
  inquirePassword: (chainId?: string) => Promise<string>;

  /**
   * Returns a new password.
   */
  inquireNewPassword: () => Promise<string>;
}
