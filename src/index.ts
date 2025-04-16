import CryptoJS from 'crypto-js';

type StorageType = 'local' | 'session';

interface StorageOptions {
  type?: StorageType;
  useEncryption?: boolean;
  secret?: string;
  useIndexedDB?: boolean;
  autoCleanInterval?: number; // 毫秒，自动清理频率（可选）
}

interface StoredData<T = any> {
  value: T;
  expire: number | null;
}

interface IndexedRecord {
  key: string;
  data: string;
}

/**
 * 安全数据存储管理器
 * 支持 localStorage / sessionStorage / IndexedDB + AES 加密 + 自动过期清理
 */
export default class BrowserStorage {
  private storage!: Storage;
  private type: StorageType;
  private useEncryption: boolean;
  private secret: string;
  private useIndexedDB: boolean;
  private db: IDBDatabase | null = null;
  private autoCleanInterval?: number;
  private cleanTimer?: number;

  constructor(options: StorageOptions = {}) {
    this.type = options.type || 'local';
    this.useEncryption = options.useEncryption || false;
    this.secret = options.secret || 'default_key';
    this.useIndexedDB = options.useIndexedDB || false;
    this.autoCleanInterval = options.autoCleanInterval;

    if (!this.useIndexedDB) {
      this.storage = this.type === 'session' ? sessionStorage : localStorage;
    } else {
      this.initIndexedDB();
    }

    if (this.autoCleanInterval) {
      this.startAutoCleaner();
    }
  }

  // 初始化 IndexedDB 数据库
  private initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SecureDB', 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('secure_store')) {
          db.createObjectStore('secure_store', { keyPath: 'key' });
        }
      };
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // AES 加密
  private encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.secret).toString();
  }

  // AES 解密
  private decrypt(text: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(text, this.secret);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch {
      return null;
    }
  }

  // 存储数据
  async set<T = any>(key: string, value: T, expireMs?: number): Promise<void> {
    const data: StoredData<T> = {
      value,
      expire: expireMs ? Date.now() + expireMs : null,
    };
    const finalData = this.useEncryption ? this.encrypt(data) : JSON.stringify(data);

    if (this.useIndexedDB) {
      await this.initIndexedDB();
      const tx = this.db!.transaction('secure_store', 'readwrite');
      tx.objectStore('secure_store').put({ key, data: finalData });
    } else {
      this.storage.setItem(key, finalData);
    }
  }

  // 获取数据
  async get<T = any>(key: string): Promise<T | null> {
    let raw: string | undefined | null;
    if (this.useIndexedDB) {
      await this.initIndexedDB();
      raw = await new Promise<string | null>((resolve) => {
        const tx = this.db!.transaction('secure_store', 'readonly');
        const store = tx.objectStore('secure_store');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result?.data || null);
        req.onerror = () => resolve(null);
      });
    } else {
      raw = this.storage.getItem(key);
    }

    if (!raw) return null;

    let data: StoredData<T>;
    try {
      data = this.useEncryption ? this.decrypt(raw) : JSON.parse(raw);
    } catch {
      await this.remove(key);
      return null;
    }

    if (data.expire && Date.now() > data.expire) {
      await this.remove(key);
      return null;
    }

    return data.value;
  }

  // 删除数据
  async remove(key: string): Promise<void> {
    if (this.useIndexedDB) {
      await this.initIndexedDB();
      const tx = this.db!.transaction('secure_store', 'readwrite');
      tx.objectStore('secure_store').delete(key);
    } else {
      this.storage.removeItem(key);
    }
  }

  // 清空所有数据
  async clear(): Promise<void> {
    if (this.useIndexedDB) {
      await this.initIndexedDB();
      const tx = this.db!.transaction('secure_store', 'readwrite');
      tx.objectStore('secure_store').clear();
    } else {
      this.storage.clear();
    }
  }

  // 启动自动清理过期项
  private startAutoCleaner(): void {
    this.cleanTimer = window.setInterval(() => this.cleanExpired(), this.autoCleanInterval);
  }

  // 清理过期项
  private async cleanExpired(): Promise<void> {
    if (this.useIndexedDB) {
      await this.initIndexedDB();
      const tx = this.db!.transaction('secure_store', 'readonly');
      const store = tx.objectStore('secure_store');
      const cursorReq = store.openCursor();

      cursorReq.onsuccess = async () => {
        const cursor = cursorReq.result;
        if (cursor) {
          const { key, data } = cursor.value as IndexedRecord;
          const item = this.useEncryption ? this.decrypt(data) : JSON.parse(data);
          if (item?.expire && Date.now() > item.expire) {
            await this.remove(key);
          }
          cursor.continue();
        }
      };
    } else {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (!key) continue;
        const raw = this.storage.getItem(key);
        if (!raw) continue;

        try {
          const item = this.useEncryption ? this.decrypt(raw) : JSON.parse(raw);
          if (item?.expire && Date.now() > item.expire) {
            this.storage.removeItem(key);
          }
        } catch {
          continue;
        }
      }
    }
  }
}
