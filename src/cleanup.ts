import { ethers } from 'ethers';
import Vouch from './models/Vouch';

const garbageCollection = async function (poh: ethers.Contract) {
  const vouches = [...await Vouch.find({})];

  vouches.map(({ submissionId }) => submissionId).forEach(async submissionId => {
    const isRegistered = await poh.isRegistered(submissionId);
    if (isRegistered || submissionId === '0x0000000000000000000000000000000000000000') {
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
