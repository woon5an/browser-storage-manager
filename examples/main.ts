import BrowserStorage from '../dist/index.es.js';

const storage = new BrowserStorage({
  type: 'local',
  useEncryption: true,
  secret: 'demoKey',
  autoCleanInterval: 10000, // 每 10 秒清理过期数据
});

(async () => {
  await storage.set('user', { name: 'Alice' }, 5000); // 5 秒后过期
  const data = await storage.get('user');
  console.log('获取数据:', data);

  // 等待 6 秒再次获取
  setTimeout(async () => {
    const expired = await storage.get('user');
    console.log('6秒后再获取（应该为null）:', expired);
  }, 6000);
})();
