import express from 'express';

export const createSessionRoutes = (sessionController) => {
  const router = express.Router();
  router.post('/sessions', sessionController);
  return router;
};
