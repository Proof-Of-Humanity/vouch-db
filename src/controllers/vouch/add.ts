import { RequestHandler } from 'express';
import Joi from '@hapi/joi';
import ethers from 'ethers';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const addVouchSchema = Joi.object().keys({
  submissionId: Joi.string().required(),
  signature: Joi.string().required(),
  digest: Joi.string().required(),
  expirationTimestamps: Joi.number().required()
});

const add: RequestHandler = async (req, res) => {
  const {
    submissionId,
    signature,
    digest,
    expirationTimestamp
  } = req.body;

  let vouch = await Vouch.findOne({ submissionId: new RegExp(`.*${submissionId}.*`, 'i') });
  const voucherAddr = ethers.utils.recoverAddress(digest, signature);
  if (!vouch) {
    vouch = new Vouch({
      submissionId,
      vouchers: [voucherAddr],
      signatures: [signature],
      expirationTimestamps: [expirationTimestamp]
    });
  } else {
    vouch.signatures = [...vouch.signatures, signature];
    vouch.vouchers = [...vouch.vouchers, voucherAddr];
    vouch.expirationTimestamps = [...vouch.expirationTimestamps, expirationTimestamp];
  }

  await vouch.save();

  res.send({
    message: 'Saved',
    vouch: vouch.toJSON()
  });
};

export default requestMiddleware(add, { validation: { body: addVouchSchema } });
