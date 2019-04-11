import winston from 'winston';

export default winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(),
  ),
  defaultMeta: { service: 'faucet' },
  transports: [new winston.transports.Console()],
});
