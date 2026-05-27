import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { ensureDirectory } from '../common/utils/ensure-directory.util';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'] as const;

@Injectable()
export class ImageStorageService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads/images');
    ensureDirectory(this.uploadDir);
  }

  saveAnalysisImage(analysisId: string, buffer: Buffer, originalName: string, mimetype?: string): string {
    const ext = this.resolveExtension(originalName, mimetype);
    const filename = `${analysisId}${ext}`;
    const fullPath = join(this.uploadDir, filename);
    writeFileSync(fullPath, buffer);
    return filename;
  }

  findStoredImagePath(analysisId: string): string | null {
    for (const ext of IMAGE_EXTENSIONS) {
      const fullPath = join(this.uploadDir, `${analysisId}${ext}`);
      if (existsSync(fullPath)) return fullPath;
    }
    return null;
  }

  readAsDataUrl(filePath: string): { dataUrl: string; mime: string } | null {
    if (!existsSync(filePath)) return null;
    const mime = this.mimeFromPath(filePath);
    const base64 = readFileSync(filePath).toString('base64');
    return { dataUrl: `data:${mime};base64,${base64}`, mime };
  }

  private resolveExtension(originalName: string, mimetype?: string): string {
    const fromName = extname(originalName).toLowerCase();
    if (fromName && IMAGE_EXTENSIONS.includes(fromName as (typeof IMAGE_EXTENSIONS)[number])) {
      return fromName;
    }
    if (mimetype === 'image/png') return '.png';
    if (mimetype === 'image/webp') return '.webp';
    if (mimetype === 'image/gif') return '.gif';
    return '.jpg';
  }

  private mimeFromPath(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'image/jpeg';
    }
  }
}
