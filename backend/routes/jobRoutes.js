import express from 'express';

export const createJobRoutes = (jobController) => {
  const router = express.Router();
  router.get('/jobs/:token', jobController);
  return router;
};
