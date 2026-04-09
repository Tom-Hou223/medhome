// 数据同步管理器
class SyncManager {
  constructor() {
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.isSyncing = false;
  }

  /**
   * 初始化同步管理器
   * @param {number} intervalMinutes - 自动同步间隔（分钟）
   */
  init(intervalMinutes = 5) {
    this.loadLastSyncTime();
    
    // 启动定时同步
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 加载上次同步时间
   */
  loadLastSyncTime() {
    try {
      const lastSync = wx.getStorageSync('lastSyncTime');
      if (lastSync) {
        this.lastSyncTime = new Date(lastSync);
      }
    } catch (error) {
      // 加载同步时间失败
    }
  }

  /**
   * 保存同步时间
   */
  saveLastSyncTime() {
    try {
      const now = new Date().toISOString();
      wx.setStorageSync('lastSyncTime', now);
      this.lastSyncTime = new Date(now);
    } catch (error) {
      // 保存同步时间失败
    }
  }

  /**
   * 执行增量同步
   */
  async syncData() {
    if (this.isSyncing) {
      return;
    }

    const DataManager = require('./dataManager.js');
    const mode = DataManager.getCurrentMode();
    
    // 游客模式不同步
    if (mode.isGuestMode) {
      return;
    }

    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      return;
    }

    this.isSyncing = true;

    try {
      const lastSyncTime = this.lastSyncTime 
        ? this.lastSyncTime.toISOString() 
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 默认同步最近24小时

      const res = await DataManager.request(
        `/sync/changes?lastSyncTime=${lastSyncTime}`,
        'GET'
      );

      if (res.code === 0) {
        const { medicines, plans, familyMembers, deletedIds, serverTime } = res.data;

        // 更新本地缓存
        await this.updateLocalCache('medicines', medicines, deletedIds.medicines);
        await this.updateLocalCache('plans', plans, deletedIds.plans);
        await this.updateLocalCache('familyMembers', familyMembers, deletedIds.familyMembers);

        // 保存同步时间
        this.lastSyncTime = new Date(serverTime);
        wx.setStorageSync('lastSyncTime', serverTime);

        // 触发同步完成事件
        this.triggerSyncEvent('success', res.data);
      }
    } catch (error) {
      this.triggerSyncEvent('error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 执行全量同步
   */
  async fullSync() {
    if (this.isSyncing) {
      return Promise.reject(new Error('同步正在进行中'));
    }

    const DataManager = require('./dataManager.js');
    const mode = DataManager.getCurrentMode();
    
    if (mode.isGuestMode) {
      return Promise.reject(new Error('游客模式不支持同步'));
    }

    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      return Promise.reject(new Error('请先选择家庭'));
    }

    this.isSyncing = true;

    try {
      const res = await DataManager.request('/sync/full', 'GET');

      if (res.code === 0) {
        const { medicines, plans, familyMembers, serverTime } = res.data;

        // 清空并重建本地缓存
        await this.rebuildLocalCache('medicines', medicines);
        await this.rebuildLocalCache('plans', plans);
        await this.rebuildLocalCache('familyMembers', familyMembers);

        // 保存同步时间
        this.lastSyncTime = new Date(serverTime);
        wx.setStorageSync('lastSyncTime', serverTime);

        this.triggerSyncEvent('success', res.data);
        return res.data;
      }
    } catch (error) {
      this.triggerSyncEvent('error', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 更新本地缓存（增量）
   */
  async updateLocalCache(type, items, deletedIds) {
    try {
      const cacheKey = `cache_${type}`;
      let cache = wx.getStorageSync(cacheKey) || [];

      // 删除已删除的项
      if (deletedIds && deletedIds.length > 0) {
        cache = cache.filter(item => !deletedIds.includes(item.id));
      }

      // 更新或添加项
      for (const item of items) {
        const index = cache.findIndex(c => c.id === item.id);
        if (index >= 0) {
          cache[index] = item;
        } else {
          cache.push(item);
        }
      }

      wx.setStorageSync(cacheKey, cache);
    } catch (error) {
      console.error(`更新${type}缓存失败:`, error);
    }
  }

  /**
   * 重建本地缓存（全量）
   */
  async rebuildLocalCache(type, items) {
    try {
      const cacheKey = `cache_${type}`;
      wx.setStorageSync(cacheKey, items);
    } catch (error) {
      console.error(`重建${type}缓存失败:`, error);
    }
  }

  /**
   * 获取本地缓存
   */
  getLocalCache(type) {
    try {
      const cacheKey = `cache_${type}`;
      return wx.getStorageSync(cacheKey) || [];
    } catch (error) {
      console.error(`获取${type}缓存失败:`, error);
      return [];
    }
  }

  /**
   * 清空本地缓存
   */
  clearLocalCache() {
    try {
      wx.removeStorageSync('cache_medicines');
      wx.removeStorageSync('cache_plans');
      wx.removeStorageSync('cache_familyMembers');
      wx.removeStorageSync('lastSyncTime');
      this.lastSyncTime = null;
      console.log('本地缓存已清空');
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  /**
   * 触发同步事件
   */
  triggerSyncEvent(type, data) {
    try {
      // 发送全局事件
      const eventChannel = getApp().globalData.eventChannel;
      if (eventChannel) {
        eventChannel.emit('dataSync', { type, data });
      }
    } catch (error) {
      console.error('触发同步事件失败:', error);
    }
  }

  /**
   * 停止自动同步
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('数据同步管理器已停止');
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      isAutoSyncEnabled: !!this.syncInterval
    };
  }
}

// 创建单例
const syncManager = new SyncManager();

module.exports = syncManager;

