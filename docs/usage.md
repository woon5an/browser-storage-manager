# 📦 Browser Storage Manager

前端开发统一安全数据存储库，支持：

✅ localStorage / sessionStorage / IndexedDB  
✅ AES 加密支持  
✅ 自动过期清理  
✅ TypeScript 支持  
✅ 支持自动清理失效项

---

## 📥 安装

```bash
npm install browser-storage-manager
```

## 快速开始

```javascript
import BrowserStorage from "browser-storage-manager";

const storage = new BrowserStorage({
  type: "local", // 存储类型：local/session
  useEncryption: true, // 是否启用加密
  secret: "your-secret-key", // 加密密钥（必填）
  useIndexedDB: false, // 是否使用 IndexedDB（默认关闭）
  autoCleanInterval: 10000, // 自动清理过期项的时间间隔（ms，可选）
});

await storage.set("user", { name: "Tom" }, 5000);
const user = await storage.get("user");
```

## 📚 API 说明

### new BrowserStorage(options?: StorageOptions)

创建安全存储实例。

| 参数                | 类型                     | 默认值          | 说明                               |
| ------------------- | ------------------------ | --------------- | ---------------------------------- |
| `type`              | `'local'` \| `'session'` | `'local'`       | 存储类型                           |
| `useEncryption`     | `boolean`                | `false`         | 是否启用 AES 加密                  |
| `secret`            | `string`                 | `'default_key'` | 加密密钥                           |
| `useIndexedDB`      | `boolean`                | `false`         | 是否使用 IndexedDB                 |
| `autoCleanInterval` | `number`                 | `undefined`     | 自动清理失效项的间隔（单位：毫秒） |

---

### set(key: string, value: any, expireMs?: number): Promise <void>

设置数据

- key: 存储键

- value: 任意数据

- expireMs: 失效时间（毫秒）

```typescript
await storage.set("token", "abc123", 60 * 1000); // 1分钟后过期
```

---

### get(key: string): Promise<T | null>

读取数据，如果已过期返回 null

- key: 读取键

```typescript
const token = await storage.get<string>("token");
```

---

### remove(key: string): Promise<void>

删除指定键的数据

- key: 删除键

```typescript
await storage.remove("token");
```

---

### clear(): Promise<void>

清空所有数据

```typescript
await storage.clear();
```

---

### 🔁 自动过期清理（可选）

设置 autoCleanInterval 后，库会自动定时清理失效数据。

```typescript
new BrowserStorage({
  autoCleanInterval: 10000, // 每 10 秒清理一次
});
```

---

### 📦 使用 IndexedDB

```typescript
new BrowserStorage({
  useIndexedDB: true,
  useEncryption: true,
  secret: "my-key",
});
```

## IndexedDB 可解决 localStorage 空间限制，适合大一点的数据或图片存储。

### 🔐 加密说明

库默认使用 AES 对称加密，配合自定义密钥，提升前端数据安全性。

```typescript
const encrypted = CryptoJS.AES.encrypt("hello", "my-secret").toString();
```

---

### 💡 使用建议

- 建议在存储 token、userInfo、缓存等敏感数据时启用加密。

- 短期缓存用 sessionStorage，长期用 localStorage。

- 存储图片、文件等大对象建议开启 useIndexedDB。

- 为避免残留，启用 autoCleanInterval 会更安全。

---

### 🧪 示例

```typescript
const store = new BrowserStorage({
  type: "session",
  useEncryption: true,
  secret: "store-key",
  autoCleanInterval: 5000,
});

await store.set("user", { name: "Alice" }, 3000);
const user = await store.get("user"); // 正常返回
setTimeout(async () => {
  const expired = await store.get("user"); // 3秒后变 null
}, 4000);
```

### 🛠 支持环境

- ✅ 所有现代浏览器

- ✅ 支持 SSR（可配置存储实现）

- ❌ 暂不支持 React Native

---

### 📝 License

MIT
