import Joi from '@hapi/joi';
import { RequestHandler } from 'express';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const searchVouchSchema = Joi.object().keys({
  submissionId: Joi.string().required()
});

const search: RequestHandler = async (req, res) => {
  const { submissionId } = req.query;

  const query = { submissionId: new RegExp(`.*${String(submissionId).toLowerCase()}.*`, 'i') };
  const vouches = await Vouch.find(query);
  res.send({ vouches });
};

export default requestMiddleware(search, { validation: { body: searchVouchSchema } });
