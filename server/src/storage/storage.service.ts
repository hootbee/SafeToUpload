import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageMode } from '../common/enums/storage-mode.enum';
import { PersistPolicy } from './types/storage.types';

@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  getPersistPolicy(): PersistPolicy {
    const persistRawInput = this.configService.get<string>('PERSIST_RAW_INPUT', 'true') === 'true';
    return {
      persistRawInput,
      storageMode: StorageMode.SERVER_DB,
    };
  }

  redactRawField<T>(value: T): T | null {
    return this.getPersistPolicy().persistRawInput ? value : null;
  }
}
