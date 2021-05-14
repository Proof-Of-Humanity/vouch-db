import { RequestHandler } from 'express';
import Joi from '@hapi/joi';
// eslint-disable-next-line camelcase
import { recoverTypedSignature_v4 } from 'eth-sig-util';
import { ethers } from 'ethers';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';
import pohAbi from '../../abis/proof-of-humanity.json';

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
