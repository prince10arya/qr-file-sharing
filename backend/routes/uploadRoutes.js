import express from 'express';

export const createUploadRoutes = (uploadController, uploadMiddleware) => {
  const router = express.Router();
  router.post('/upload/:token', uploadMiddleware.single('file'), uploadController);
  return router;
};
