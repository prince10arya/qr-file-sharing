import multer from 'multer';
import multerS3 from 'multer-s3';
import { randomBytes } from 'crypto';

export const createUploadMiddleware = (s3Client, bucket, maxFileSize) => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      acl: 'private',
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${randomBytes(8).toString('hex')}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    fileFilter: (req, file, cb) => {
      const allowedExtensions = /\.(pdf|png|jpg|jpeg|doc|docx)$/i;
      const allowedMimeTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      const hasValidExtension = allowedExtensions.test(file.originalname);
      const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
      
      if (hasValidExtension || hasValidMimeType) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    },
    limits: { 
      fileSize: maxFileSize
    }
  });
};
