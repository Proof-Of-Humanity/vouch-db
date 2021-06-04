// Disabling no-await-in-loop because operations cannot be made parallel
/* eslint-disable no-await-in-loop */
import { ethers } from 'ethers';
import delay from 'delay';
import logger from './logger';
import { SyncBlock, Vouch } from './models';

/**
 * This is a bot that periodically scans the blockchain for new reapply events.
 * If events are found, it updates `resolved` flag of vouches so they can be picked up again.
 * @param provider The provider to use to check for new events.
 * @param poh The Proof of Humanity contract to use for the event filter.
 * @param botScanDelay How long the bot waits before querying the blockchain.
 * @returns A bot that can be started or stopped.
 */
function buildReapplyBot(
  provider: ethers.providers.JsonRpcProvider,
  poh: ethers.Contract,
  botScanDelay: number
) {
  let shutdownRequested = false;
  let running = false;
  const SYNC_BLOCK_KEY = 'SYNC-BLOCK-REAPPLY';

  return {
    async start() {
      running = true;
      let syncBlock = await SyncBlock.findOne({ id: SYNC_BLOCK_KEY });
      if (!syncBlock) {
        // Engine starting for the very first time.
        syncBlock = new SyncBlock({
          id: SYNC_BLOCK_KEY,
          lastBlock: await provider.getBlockNumber()
        });
        await syncBlock.save();
      }

      const intervalLength = 500;
      const interval = {
        fromBlock: syncBlock.lastBlock,
        toBlock: syncBlock.lastBlock + intervalLength
      };

      logger.info(`Starting interval: ${JSON.stringify(interval)}`);
      while (!shutdownRequested) {
        running = true;
        logger.info(`Checking logs ${JSON.stringify(interval)}`);
        logger.info(`Current blocknum ${await provider.getBlockNumber()}`);
        const addSubmissionEvents = (
          await provider.getLogs({
            ...poh.filters.AddSubmission(),
            ...interval
          })
        );

        await Promise.all(addSubmissionEvents
          .map(log => poh.interface.parseLog(log))
          .map(async log => {
            try {
              const user = await Vouch.findOne({
                submissionId: log.args[0].toLowerCase()
              });

              if (!user) return;

              user.resolved = false;
              user.save();
            } catch (error) {
              logger.warn(`Could not reset vouch: ${error}`);
            }
          }));

        // We select the next starting block as follows:
        // - If the blockchain caught up or passed interval.toBlock
        //   we set the starting block to be interval.toBlock.
        // - Otherwise, we check if there were returned events for the current
        //   interval. If there were, we set the starting block to be the one
        //   just after the block where the last event was emitted.
        // - Otherwise, we keep the current block interval.
        const currentBlockNumber = await provider.getBlockNumber();
        if (currentBlockNumber >= interval.toBlock) interval.fromBlock = interval.toBlock;
        else if (addSubmissionEvents.length > 0) {
          interval.fromBlock = addSubmissionEvents
            .map(({ blockNumber }) => blockNumber)
            .reduce((a, b) => Math.max(a, b), 0) + 1;
        }

        interval.toBlock = interval.fromBlock + intervalLength;

        syncBlock.lastBlock = interval.fromBlock;
        syncBlock = await syncBlock.save();
        await delay(botScanDelay);
        running = false;
      }
    },
    stop() {
      shutdownRequested = true;
    },
    isRunning() {
      return running;
    }
  };
}

export default buildReapplyBot;
