import { RequestHandler } from 'express';
import Joi from '@hapi/joi';
// eslint-disable-next-line camelcase
import { recoverTypedSignature_v4 } from 'eth-sig-util';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const addVouchSchema = Joi.object().keys({
  signature: Joi.string().required(),
  msgData: Joi.string().required()
});

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

  let vouch = await Vouch.findOne({ submissionId });

  const voucherAddr = recoverTypedSignature_v4({
    data: msgData,
    sig: signature
  });

  if (!vouch) {
    vouch = new Vouch({
      submissionId,
      vouchers: [voucherAddr],
      signatures: [signature],
      expirationTimestamps: [expirationTimestamp]
    });
  } else if (!vouch.vouchers.includes(voucherAddr)) {
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
