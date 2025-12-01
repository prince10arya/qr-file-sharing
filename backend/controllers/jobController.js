export const getJobsController = (jobModel) => {
  return async (req, res) => {
    try {
      const { token } = req.params;
      const result = await jobModel.getBySession(token);

      if (!result) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};
