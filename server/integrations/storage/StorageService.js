import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StorageService {
  constructor() {
    this.driver = process.env.STORAGE_DRIVER || 'local';
    this.uploadDir = path.resolve(__dirname, '../../../public/uploads');

    if (this.driver === 'local') {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }

    if (this.driver === 'r2') {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
        },
      });

      this.bucket = process.env.CLOUDFLARE_R2_BUCKET;
      this.publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    }
  }

  validateFile(
    file,
    options = { maxSizeBytes: 5 * 1024 * 1024 }
  ) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF`
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}`);
    }

    if (file.size > options.maxSizeBytes) {
      throw new Error(
        `File size exceeds maximum limit of ${
          options.maxSizeBytes / (1024 * 1024)
        }MB`
      );
    }

    return true;
  }

  async saveFileDELETE(file, customFilename = null) {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();

    const finalFilename = customFilename
      ? `${customFilename}${ext}`
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    // =========================
    // Cloudflare R2
    // =========================
    if (this.driver === 'r2') {
      if (!this.s3) {
        throw new Error('R2 storage is not initialized');
      }

      if (!this.bucket) {
        throw new Error('CLOUDFLARE_R2_BUCKET is not configured');
      }

      let body;

      if (file.buffer) {
        body = file.buffer;
      } else if (file.path) {
        body = fs.createReadStream(file.path);
      } else {
        throw new Error('Uploaded file has no buffer or path');
      }

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: finalFilename,
          Body: body,
          ContentType: file.mimetype,
        })
      );

      return `${this.publicUrl.replace(/\/$/, '')}/${finalFilename}`;
    }

    // =========================
    // Local Storage
    // =========================
    const targetPath = path.join(
      this.uploadDir,
      finalFilename
    );

    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, targetPath);
    } else {
      throw new Error('Uploaded file has no buffer or path');
    }

    return `/uploads/${finalFilename}`;
  }

  async saveFile(file, customFilename = null) {
    this.validateFile(file);
  
    const finalFilename = customFilename
      ? `${customFilename}.webp`
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  
    // =========================
    // Convert image to WebP
    // =========================
    let body;
  
    if (file.buffer) {
      body = await sharp(file.buffer)
        .webp({ quality: 85 })
        .toBuffer();
    } else if (file.path) {
      body = await sharp(file.path)
        .webp({ quality: 85 })
        .toBuffer();
    } else {
      throw new Error('Uploaded file has no buffer or path');
    }
  
    // =========================
    // Cloudflare R2
    // =========================
    if (this.driver === 'r2') {
      if (!this.s3) {
        throw new Error('R2 storage is not initialized');
      }
  
      if (!this.bucket) {
        throw new Error('CLOUDFLARE_R2_BUCKET is not configured');
      }
  
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: finalFilename,
          Body: body,
          ContentType: 'image/webp',
        })
      );
  
      // return `${this.publicUrl.replace(/\/$/, '')}/${finalFilename}`;
      return finalFilename;
    }
  
    // =========================
    // Local Storage
    // =========================
    const targetPath = path.join(
      this.uploadDir,
      finalFilename
    );
  
    fs.writeFileSync(targetPath, body);
  
    return `/uploads/${finalFilename}`;
  }

  async deleteFile(fileUrl) {
    if (!fileUrl) return;
  
    try {
      // =========================
      // Cloudflare R2
      // =========================
      if (this.driver === 'r2') {
        if (!this.s3) {
          throw new Error('R2 storage is not initialized');
        }
  
        if (!this.bucket) {
          throw new Error('CLOUDFLARE_R2_BUCKET is not configured');
        }
  
        // Convert full public URL to R2 object key
        const publicUrl = this.publicUrl.replace(/\/$/, '');
  
        if (!fileUrl.startsWith(publicUrl)) {
          console.warn('R2 file URL does not belong to configured public URL:', fileUrl);
          return;
        }
  
        const key = decodeURIComponent(
          fileUrl.replace(`${publicUrl}/`, '')
        );
  
        if (!key) return;
  
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          })
        );
  
        console.log(`R2 file deleted: ${key}`);
  
        return true;
      }
  
      // =========================
      // Local Storage
      // =========================
      const filename = path.basename(fileUrl);
  
      if (!filename) return;
  
      const filePath = path.join(
        this.uploadDir,
        filename
      );
  
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local file deleted: ${filename}`);
      }
  
      return true;
  
    } catch (error) {
      console.error('Storage delete error:', error);
      throw error;
    }
  }
}

export default new StorageService();