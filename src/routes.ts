import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import swaggerUi from 'swagger-ui-express';
import apiSpec from '../openapi.json';

import * as VouchController from './controllers/vouch';

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }'
};

const router = Router();
const speedLimiter = slowDown({
  windowMs: 1000, // 1 second
  delayAfter: 1, // allow 1 requests per second then...
  delayMs: 200 // 2th request has a 200ms delay, 3th has a 400ms delay, 4th gets 600ms, etc.
});
const rateLimiter = rateLimit({
  windowMs: 1000, // second hour window
  max: 5, // start blocking after 5 requests
  message:
    'Too many accounts created from this IP, please try again after an hour'
});

// Vouch routes
router.post('/vouch/add', speedLimiter, rateLimiter, VouchController.add);
router.get('/vouch/search', VouchController.search);
router.post("/vouch/deleteSubmission", VouchController.deleteSubmission);

// Dev routes
if (process.env.NODE_ENV === 'development') {
  router.use('/dev/api-docs', swaggerUi.serve);
  router.get('/dev/api-docs', swaggerUi.setup(apiSpec, swaggerUiOptions));
}

export default router;
