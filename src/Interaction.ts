export default interface Interaction {
  /**
   * Returns a password.
   */
  inquirePassword: () => Promise<string>;

  /**
   * Returns a new password.
   */
  inquireNewPassword: () => Promise<string>;
}
