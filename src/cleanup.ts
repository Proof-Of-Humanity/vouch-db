import { ethers } from 'ethers';
import logger from './logger';
import { Vouch } from './models';

const garbageCollection = async function (poh: ethers.Contract) {
  logger.info('Running garbage collection');
  const vouches = [...await Vouch.find({ resolved: null })];

  const VOUCHING_PHASE = 1;
  vouches.forEach(async vouch => {
    const { submissionId } = vouch;
    const { status } = await poh.getSubmissionInfo(submissionId);

    if (Number(status) !== VOUCHING_PHASE) {
      vouch.set('resolved', true);
      await vouch.save();
    };
  });
  logger.info('Finished garbage collection');
};

export default garbageCollection;
