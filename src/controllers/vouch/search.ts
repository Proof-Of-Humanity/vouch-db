import Joi from '@hapi/joi';
import { RequestHandler } from 'express';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const searchVouchSchema = Joi.object().keys({
  submissionId: Joi.string(),
  voucherAddr: Joi.string(),
  minVouchers: Joi.number()
});

const search: RequestHandler = async (req, res) => {
  const { submissionId, voucherAddr, minVouchers } = req.query;

  const query: any = {};
  if (submissionId) {
    query['$expr'] = {
      $eq: [String(submissionId).toLowerCase(), '$submissionId']
    };
  }

  if (minVouchers) query.vouchersLength = { $gte: Number(minVouchers) };

  if (voucherAddr) {
    query['$expr'] = query['$expr'] || {};
    query['$expr']['$in'] = [String(voucherAddr).toLowerCase(), '$vouchers'];
  }

  const vouches = await Vouch.find(query);
  res.send({ vouches });
};

export default requestMiddleware(search, { validation: { body: searchVouchSchema } });
