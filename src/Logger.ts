import * as winston from 'winston';

export default winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  defaultMeta: { service: 'faucet' },
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
});
