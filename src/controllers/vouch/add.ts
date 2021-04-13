import { RequestHandler } from 'express';
import Joi from '@hapi/joi';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

export const addVouchSchema = Joi.object().keys({
  submissionId: Joi.string().required(),
  vouchers: Joi.array().items(Joi.string()).min(1).required(),
  signatures: Joi.array().items(Joi.string()).min(1).required(),
  expirationTimetamps: Joi.array().items(Joi.number().required()).min(1).required()
});

const add: RequestHandler = async (req, res) => {
  const {
    submissionId,
    vouchers,
    signatures,
    expirationTimetamps
  } = req.body;

  const vouch = new Vouch({
    submissionId,
    vouchers,
    signatures,
    expirationTimetamps
  });
  await vouch.save();

  res.send({
    message: 'Saved',
    vouch: vouch.toJSON()
  });
};

export default requestMiddleware(add, { validation: { body: addVouchSchema } });
