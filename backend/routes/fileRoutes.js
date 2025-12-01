import express from 'express';

export const createFileRoutes = (fileController) => {
  const router = express.Router();
  router.get('/files/:jobId', fileController);
  return router;
};
