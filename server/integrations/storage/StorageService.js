import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StorageService {
  constructor() {
    this.driver = process.env.STORAGE_DRIVER || 'local';
    this.uploadDir = path.resolve(__dirname, '../../../public/uploads');

    // Ensure upload dir exists for local driver
    if (this.driver === 'local') {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  /**
   * Validate MIME type, file extension and size
   */
  validateFile(file, options = { maxSizeBytes: 5 * 1024 * 1024 }) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}`);
    }

    if (file.size > options.maxSizeBytes) {
      throw new Error(`File size exceeds maximum limit of ${options.maxSizeBytes / (1024 * 1024)}MB`);
    }

    return true;
  }

  /**
   * Save uploaded file to local disk or R2
   */
  async saveFile(file, customFilename = null) {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const finalFilename = customFilename ? `${customFilename}${ext}` : `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    if (this.driver === 'r2') {
      // Cloudflare R2 S3-compatible upload logic
      const r2Url = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-r2.freshmart.local';
      // In production, instantiate S3Client with credentials and send PutObjectCommand
      return `${r2Url}/${finalFilename}`;
    }

    // Default Local Storage
    const targetPath = path.join(this.uploadDir, finalFilename);
    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, targetPath);
    }

    return `/uploads/${finalFilename}`;
  }
}

export default new StorageService();
