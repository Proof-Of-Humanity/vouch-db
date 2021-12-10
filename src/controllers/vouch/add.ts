import { RequestHandler } from 'express';
import Joi from '@hapi/joi';
// eslint-disable-next-line camelcase
import { recoverTypedSignature_v4 } from 'eth-sig-util';
import { ethers } from 'ethers';
import logger from '../../logger';
import requestMiddleware from '../../middleware/request-middleware';
import { Vouch } from '../../models';
import pohAbi from '../../abis/proof-of-humanity.json';
const fetch = require("cross-fetch");

const addVouchSchema = Joi.object().keys({
  signature: Joi.string().required(),
  msgData: Joi.string().required()
});

const provider = new ethers.providers.InfuraProvider('homestead', process.env.INFURA_KEY);
const poh = new ethers.Contract(process.env.POH_ADDRESS, pohAbi, provider);

const add: RequestHandler = async (req, res) => {
  
   const {
    signature,
    msgData: msgDataString
  } = req.body;
  const msgData = JSON.parse(msgDataString);

  const { message } = msgData || {};
  const {
    vouchedSubmission: submissionId,
    voucherExpirationTimestamp: expirationTimestamp
  } = message || {};

  const voucherAddr = recoverTypedSignature_v4({
    data: msgData,
    sig: signature
  });
  let idQuery = `id: "IdQuery"`;
   let query = `query IdQuery(\n  $id: ID!\n  $_id: [String!]\n) {submission(id: $id) {\n    disputed\nvouchees{\nstatus\n disputed\nrequests{\n challenges{\n creationTime \n} \n}    id\n  }\n}\n}`
   let variables = {
    id: voucherAddr,
    _id: [voucherAddr]
}
let body = JSON.stringify({id: idQuery, query: query, variables: variables});
let status = await fetch("https://api.thegraph.com/subgraphs/name/kleros/proof-of-humanity-mainnet", {
  method: "POST",
  body: body,
  headers: {
      "Content-Type": "application/json"
  }
});
let response = await status.json();
let vouchingTimeout = false;
if(response.data.submission !== null){
  logger.debug(JSON.stringify(response.data.submission.vouchees));

  const disputedVouches = response.data.submission.vouchees.filter(
    (vouchee:any) => {return vouchee.disputed === true}
  );

 

  logger.debug(disputedVouches);
  if (disputedVouches.length > 0) {
    
    const latestChallengedVouchee = disputedVouches.sort((a:any, b:any) =>
      a.requests[0].challenges[0].creationTime <
      b.requests[0].challenges[0].creationTime
        ? 1
        : -1
    );
    

    const challengeTimestamp =
      latestChallengedVouchee[0].requests[0].challenges[0].creationTime * 1000;
      
let timestamp = challengeTimestamp + 5200000000 > Date.now();
let removed = latestChallengedVouchee[0].status === 'None';
    vouchingTimeout = timestamp && removed;
    logger.debug(vouchingTimeout)
  }
  

}
  if(vouchingTimeout){
    res.status(400).json({
      message:'Human is not able to vouch'
    });
    return;
  }
  if (!(await poh.isRegistered(voucherAddr))) {
    res.status(400).json({
      message: 'Voucher not registered.'
    });
    return;
  }

  let vouch = await Vouch.findOne({ submissionId });
  if (!vouch) {
    vouch = new Vouch({
      submissionId,
      vouchers: [voucherAddr],
      signatures: [signature],
      expirationTimestamps: [expirationTimestamp],
      vouchersLength: 1
    });
  } else if (!vouch.vouchers.includes(voucherAddr)) {
    vouch.signatures = [...vouch.signatures, signature];
    vouch.vouchers = [...vouch.vouchers, voucherAddr];
    vouch.expirationTimestamps = [...vouch.expirationTimestamps, expirationTimestamp];
    vouch.vouchersLength += 1;
  }

  await vouch.save();

  res.json({
    message: 'Saved',
    vouch: vouch.toJSON()
  });
};

export default requestMiddleware(add, { validation: { body: addVouchSchema } });
