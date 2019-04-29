import Interaction from '../Interaction';

/**
 * Interaction implementation that always returns the same password.
 */
export default class NonInteractiveInteraction implements Interaction {
  private password;

  /**
   * @param password This class will always return this given password.
   */
  public constructor(password: string) {
    this.password = password;
  }

  /**
   * Returns the stored password.
   */
  public async inquirePassword(): Promise<string> {
    return this.password;
  }

  /**
   * Returns the stored password.
   */
  public async inquireNewPassword(): Promise<string> {
    return this.password;
  }
}
