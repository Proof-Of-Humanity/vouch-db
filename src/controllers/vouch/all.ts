import Joi from '@hapi/joi';
import { RequestHandler } from 'express';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const allSchema = Joi.object().keys({
  minVouches: Joi.number()
});

const all: RequestHandler = async (req, res) => {
  const { minVouchers } = req.query;
  let query = null;
  if (minVouchers) query = { vouchersLength: { $gte: Number(minVouchers) } };

  const vouches = await Vouch.find(query);
  res.send({ vouches });
};

export default requestMiddleware(all, { validation: { body: allSchema } });
