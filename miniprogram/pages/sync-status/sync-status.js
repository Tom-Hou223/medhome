Page({
  data: {
    currentFamily: null,
    syncStatus: {
      isSyncing: false,
      lastSyncTime: null
    },
    statistics: {
      memberCount: 0,
      medicineCount: 0,
      planCount: 0,
      familyMemberCount: 0
    }
  },

  onLoad() {
    this.loadCurrentFamily();
    this.loadSyncStatus();
    this.loadStatistics();
    this.setupSyncListener();
  },

  onShow() {
    this.loadCurrentFamily();
    this.loadStatistics();
  },

  onUnload() {
    // 移除同步监听
    const app = getApp();
    if (app.globalData.eventChannel) {
      app.globalData.eventChannel.off('dataSync', this.onSyncEvent);
    }
  },

  loadCurrentFamily() {
    const DataManager = require('../../utils/dataManager.js');
    const family = DataManager.getCurrentFamily();
    
    if (family) {
      this.setData({ currentFamily: family });
    }
  },

  loadSyncStatus() {
    const SyncManager = require('../../utils/syncManager.js');
    const status = SyncManager.getSyncStatus();
    
    this.setData({
      syncStatus: {
        isSyncing: status.isSyncing,
        lastSyncTime: status.lastSyncTime ? this.formatTime(status.lastSyncTime) : '从未同步'
      }
    });
  },

  async loadStatistics() {
    const DataManager = require('../../utils/dataManager.js');
    
    try {
      const res = await DataManager.request('/sync/statistics', 'GET');
      if (res.code === 0) {
        this.setData({ statistics: res.data });
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  },

  setupSyncListener() {
    const app = getApp();
    if (app.globalData.eventChannel) {
      this.onSyncEvent = (event) => {
        if (event.type === 'success') {
          this.loadSyncStatus();
          this.loadStatistics();
          
          wx.showToast({
            title: '数据已同步',
            icon: 'success',
            duration: 1500
          });
        } else if (event.type === 'error') {
          wx.showToast({
            title: '同步失败',
            icon: 'none'
          });
        }
      };
      
      app.globalData.eventChannel.on('dataSync', this.onSyncEvent);
    }
  },

  async onManualSync() {
    const SyncManager = require('../../utils/syncManager.js');
    
    wx.showLoading({
      title: '同步中...',
      mask: true
    });

    try {
      await SyncManager.fullSync();
      wx.hideLoading();
      
      wx.showToast({
        title: '同步成功',
        icon: 'success'
      });

      this.loadSyncStatus();
      this.loadStatistics();
    } catch (error) {
      wx.hideLoading();
      
      wx.showToast({
        title: error.message || '同步失败',
        icon: 'none'
      });
    }
  },

  onSwitchFamily() {
    wx.navigateTo({
      url: '/pages/family-select/family-select'
    });
  },

  onManageFamily() {
    if (!this.data.currentFamily) {
      wx.showToast({
        title: '请先选择家庭',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/family-manage/family-manage'
    });
  },

  formatTime(date) {
    const now = new Date();
    const syncTime = new Date(date);
    const diff = now - syncTime;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      return `${days}天前`;
    }
  }
});

