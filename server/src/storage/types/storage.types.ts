import { StorageMode } from '../../common/enums/storage-mode.enum';

export interface PersistPolicy {
  persistRawInput: boolean;
  storageMode: StorageMode;
}
