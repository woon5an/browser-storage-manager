var l = Object.defineProperty;
var h = (o, e, t) => e in o ? l(o, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : o[e] = t;
var n = (o, e, t) => h(o, typeof e != "symbol" ? e + "" : e, t);
import u from "crypto-js";
class p {
  constructor(e = {}) {
    n(this, "storage");
    n(this, "type");
    n(this, "useEncryption");
    n(this, "secret");
    n(this, "useIndexedDB");
    n(this, "db", null);
    n(this, "autoCleanInterval");
    n(this, "cleanTimer");
    this.type = e.type || "local", this.useEncryption = e.useEncryption || !1, this.secret = e.secret || "default_key", this.useIndexedDB = e.useIndexedDB || !1, this.autoCleanInterval = e.autoCleanInterval, this.useIndexedDB ? this.initIndexedDB() : this.storage = this.type === "session" ? sessionStorage : localStorage, this.autoCleanInterval && this.startAutoCleaner();
  }
  // 初始化 IndexedDB 数据库
  initIndexedDB() {
    return new Promise((e, t) => {
      const s = indexedDB.open("SecureDB", 1);
      s.onupgradeneeded = (r) => {
        const i = r.target.result;
        i.objectStoreNames.contains("secure_store") || i.createObjectStore("secure_store", { keyPath: "key" });
      }, s.onsuccess = (r) => {
        this.db = r.target.result, e();
      }, s.onerror = () => t(s.error);
    });
  }
  // AES 加密
  encrypt(e) {
    return u.AES.encrypt(JSON.stringify(e), this.secret).toString();
  }
  // AES 解密
  decrypt(e) {
    try {
      const t = u.AES.decrypt(e, this.secret);
      return JSON.parse(t.toString(u.enc.Utf8));
    } catch {
      return null;
    }
  }
  // 存储数据
  async set(e, t, s) {
    const r = {
      value: t,
      expire: s ? Date.now() + s : null
    }, i = this.useEncryption ? this.encrypt(r) : JSON.stringify(r);
    this.useIndexedDB ? (await this.initIndexedDB(), this.db.transaction("secure_store", "readwrite").objectStore("secure_store").put({ key: e, data: i })) : this.storage.setItem(e, i);
  }
  // 获取数据
  async get(e) {
    let t;
    if (this.useIndexedDB ? (await this.initIndexedDB(), t = await new Promise((r) => {
      const a = this.db.transaction("secure_store", "readonly").objectStore("secure_store").get(e);
      a.onsuccess = () => {
        var d;
        return r(((d = a.result) == null ? void 0 : d.data) || null);
      }, a.onerror = () => r(null);
    })) : t = this.storage.getItem(e), !t) return null;
    let s;
    try {
      s = this.useEncryption ? this.decrypt(t) : JSON.parse(t);
    } catch {
      return await this.remove(e), null;
    }
    return s.expire && Date.now() > s.expire ? (await this.remove(e), null) : s.value;
  }
  // 删除数据
  async remove(e) {
    this.useIndexedDB ? (await this.initIndexedDB(), this.db.transaction("secure_store", "readwrite").objectStore("secure_store").delete(e)) : this.storage.removeItem(e);
  }
  // 清空所有数据
  async clear() {
    this.useIndexedDB ? (await this.initIndexedDB(), this.db.transaction("secure_store", "readwrite").objectStore("secure_store").clear()) : this.storage.clear();
  }
  // 启动自动清理过期项
  startAutoCleaner() {
    this.cleanTimer = window.setInterval(() => this.cleanExpired(), this.autoCleanInterval);
  }
  // 清理过期项
  async cleanExpired() {
    if (this.useIndexedDB) {
      await this.initIndexedDB();
      const s = this.db.transaction("secure_store", "readonly").objectStore("secure_store").openCursor();
      s.onsuccess = async () => {
        const r = s.result;
        if (r) {
          const { key: i, data: c } = r.value, a = this.useEncryption ? this.decrypt(c) : JSON.parse(c);
          a != null && a.expire && Date.now() > a.expire && await this.remove(i), r.continue();
        }
      };
    } else
      for (let e = 0; e < this.storage.length; e++) {
        const t = this.storage.key(e);
        if (!t) continue;
        const s = this.storage.getItem(t);
        if (s)
          try {
            const r = this.useEncryption ? this.decrypt(s) : JSON.parse(s);
            r != null && r.expire && Date.now() > r.expire && this.storage.removeItem(t);
          } catch {
            continue;
          }
      }
  }
}
export {
  p as default
};
