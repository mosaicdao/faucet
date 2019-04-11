/**
 * An error that can occur during handling of client requests in a server.
 */
export default class ServerError extends Error {
  /**
   * @param message Message that should be returned to the client.
   * @param code The HTTP return code associated with this error.
   */
  constructor(readonly message: string, readonly code: number) {
    super(message);
  }
}
