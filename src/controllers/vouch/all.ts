import { RequestHandler } from 'express';
import requestMiddleware from '../../middleware/request-middleware';
import Vouch from '../../models/Vouch';

const all: RequestHandler = async (req, res) => {
  const vouches = await Vouch.find();
  res.send({ vouches });
};

export default requestMiddleware(all);
