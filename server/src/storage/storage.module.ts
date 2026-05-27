import { Module } from '@nestjs/common';
import { ImageStorageService } from './image-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [StorageService, ImageStorageService],
  exports: [StorageService, ImageStorageService],
})
export class StorageModule {}
