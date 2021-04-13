import { RequestHandler } from 'express';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const search: RequestHandler = async (req, res) => {
  const { submissionId } = req.query;

  const query = { submissionId: new RegExp(`.*${submissionId}.*`, 'i') };
  const vouches = await Vouch.find(query);
  res.send({ vouches });
};

export default requestMiddleware(search);
