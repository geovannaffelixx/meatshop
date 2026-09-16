import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Express } from 'express';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaStorageService {
  private readonly cloudinaryEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this.cloudinaryEnabled = Boolean(cloudName && apiKey && apiSecret);
    if (this.cloudinaryEnabled) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    if (this.cloudinaryEnabled) return this.uploadToCloudinary(file, folder);

    const extension =
      path.extname(file.originalname).toLowerCase() || this.extension(file.mimetype);
    const filename = `${crypto.randomUUID()}${extension}`;
    const directory = path.join(process.cwd(), 'uploads', folder);
    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(path.join(directory, filename), file.buffer);
    return `/uploads/${folder}/${filename}`;
  }

  async delete(url: string | null | undefined): Promise<void> {
    if (!url) return;
    if (this.cloudinaryEnabled && this.isCloudinaryUrl(url)) {
      const publicId = this.cloudinaryPublicId(url);
      if (publicId) await cloudinary.uploader.destroy(publicId, { invalidate: true });
      return;
    }
    if (!url.startsWith('/uploads/')) return;
    const relative = url
      .slice('/uploads/'.length)
      .split('/')
      .map((segment) => path.basename(segment));
    const target = path.resolve(process.cwd(), 'uploads', ...relative);
    const root = path.resolve(process.cwd(), 'uploads');
    if (!target.startsWith(`${root}${path.sep}`)) return;
    await fs.promises.unlink(target).catch(() => undefined);
  }

  private uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `meatshop/${folder}`, resource_type: 'image' },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(new ServiceUnavailableException('Could not store the image'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }

  private isCloudinaryUrl(url: string): boolean {
    try {
      return new URL(url).hostname === 'res.cloudinary.com';
    } catch {
      return false;
    }
  }

  private cloudinaryPublicId(url: string): string | null {
    const match = new URL(url).pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  private extension(mimeType: string): string {
    return (
      (
        {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'image/gif': '.gif',
        } as Record<string, string>
      )[mimeType] ?? ''
    );
  }
}
