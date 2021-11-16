import Joi from '@hapi/joi';
import { RequestHandler } from 'express';
import requestMiddleware from '../../middleware/request-middleware';
import { Vouch } from '../../models';

const searchVouchSchema = Joi.object().keys({
  submissionId: Joi.string(),
  voucherAddr: Joi.string(),
  minVouchers: Joi.number(),
  includeResolved: Joi.boolean()
});

const search: RequestHandler = async (req, res) => {
  const {
    submissionId, voucherAddr, minVouchers, includeResolved
  } = req.query;

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

  if (!submissionId && !voucherAddr && !includeResolved) query.resolved = null;

  const vouches = await Vouch.find(query);
  res.json({ vouches });
};

export default requestMiddleware(search, { validation: { body: searchVouchSchema } });
