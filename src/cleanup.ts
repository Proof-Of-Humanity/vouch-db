import { ethers } from 'ethers';
import Vouch from './models/Vouch';

const garbageCollection = async function (poh: ethers.Contract) {
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
};

export default garbageCollection;
