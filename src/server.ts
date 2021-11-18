import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
  dotenv.config({ path: '.env.default' });
}

import util from 'util';
import { ethers } from 'ethers';
import app from './app';
import garbageCollection from './cleanup';
import SafeMongooseConnection from './lib/safe-mongoose-connection';
import logger from './logger';
import pohAbi from './abis/proof-of-humanity.json';
import buildReapplyBot from './reapply-bot';

const PORT = process.env.PORT || 3000;

let debugCallback = null;
if (process.env.NODE_ENV === 'development') {
  debugCallback = (collectionName: string, method: string, query: any): void => {
    const message = `${collectionName}.${method}(${util.inspect(query, { colors: true, depth: null })})`;
    logger.log({
      level: 'silly',
      message,
      consoleLoggerOptions: { label: 'MONGO' }
    });
  };
}

const safeMongooseConnection = new SafeMongooseConnection({
  mongoUrl: process.env.MONGO_URL,
  debugCallback,
  onStartConnection: mongoUrl => logger.info(`Connecting to MongoDB at ${mongoUrl}`),
  onConnectionError: (error, mongoUrl) => logger.log({
    level: 'error',
    message: `Could not connect to MongoDB at ${mongoUrl}`,
    error
  }),
  onConnectionRetry: mongoUrl => logger.info(`Retrying to MongoDB at ${mongoUrl}`)
});

const serve = () => app.listen(PORT, () => {
  logger.debug(`🌏 Express server started at http://localhost:${PORT}`);

  if (process.env.NODE_ENV === 'development') {
    // This route is only present in development mode
    logger.debug(`⚙️  Swagger UI hosted at http://localhost:${PORT}/dev/api-docs`);
  }
});

if (process.env.MONGO_URL == null) {
  logger.error('MONGO_URL not specified in environment');
  process.exit(1);
} else {
  safeMongooseConnection.connect(mongoUrl => {
    logger.info(`Connected to MongoDB at ${mongoUrl}`);
    serve();
  });
}

const provider = new ethers.providers.InfuraProvider('homestead', process.env.INFURA_KEY);
const poh = new ethers.Contract(process.env.POH_ADDRESS, pohAbi, provider);

// Listen for reapply events and "unresolve" submissions.
const botScanDelay = 30 * 1000;
const reapplyBot = buildReapplyBot(provider, poh, botScanDelay);
reapplyBot.start();

// Close the Mongoose connection, when receiving SIGINT
process.on('SIGINT', () => {
  console.log('\n'); /* eslint-disable-line */
  logger.info('Gracefully shutting down');
  logger.info('Closing the MongoDB connection');
  safeMongooseConnection.close(err => {
    if (err) {
      logger.log({
        level: 'error',
        message: 'Error shutting closing mongo connection',
        error: err
      });
      process.exit(1);
    } else {
      logger.info('Mongo connection closed successfully');
      reapplyBot.stop();
      setInterval(() => {
        logger.info(`Waiting for bot (this can take up to ${botScanDelay / 1000} seconds)`);
        if (!reapplyBot.isRunning()) process.exit(0);
      }, botScanDelay);
    }
  }, true);
});

// Garbage collect on init and then periodically.
garbageCollection(poh);
setInterval(() => garbageCollection(poh), Number(process.env.GC_PERIOD_MINUTES) * 60 * 1000);
