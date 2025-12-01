import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

export const createSessionController = (sessionModel, qrCache, publicUrl) => {
  return async (req, res) => {
    try {
      const { shopId } = req.body;
      const token = randomBytes(10).toString('hex');
      const uploadUrl = `${publicUrl}/upload/${token}`;

      // Check cache first
      let qrDataUrl = await qrCache.get(uploadUrl);
      
      if (!qrDataUrl) {
        qrDataUrl = await QRCode.toDataURL(uploadUrl, { width: 300, margin: 2 });
        await qrCache.set(uploadUrl, qrDataUrl);
      }

      const { expiresAt } = await sessionModel.create(token, shopId);

      res.json({ token, uploadUrl, qrDataUrl, expiresAt });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
};
