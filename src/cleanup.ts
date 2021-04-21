import { ethers } from 'ethers';
import Vouch from './models/Vouch';

const garbageCollection = async function (poh: ethers.Contract) {
  const vouches = [...await Vouch.find({})];

  const VOUCHING_PHASE = 1;
  vouches.map(({ submissionId }) => submissionId).forEach(async submissionId => {
    const { status } = await poh.getSubmissionInfo(submissionId);

    if (Number(status) !== VOUCHING_PHASE) {
      const query: any = {
        $expr: {
          $eq: [String(submissionId).toLowerCase(), '$submissionId']
        }
      };
      await Vouch.deleteOne(query);
    };
  });
};

export default garbageCollection;
