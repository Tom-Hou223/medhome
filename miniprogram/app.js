const NotificationManager = require('./utils/notificationManager.js');
const DataManager = require('./utils/dataManager.js');
const SyncManager = require('./utils/syncManager.js');

App({
  onLaunch() {
    this.checkLoginStatus();
    this.initSeniorMode();
    this.initNotificationManager();
    this.initSyncManager();
    this.initEventChannel();
  },

  onShow() {
    this.startNotificationManager();
    this.startSyncManager();
  },

  onHide() {
    this.stopNotificationManager();
    this.stopSyncManager();
  },

  checkLoginStatus() {
    const mode = DataManager.getCurrentMode();
    const isLoggedIn = mode.isLoggedIn;

    // 只在需要时更新本地存储，避免覆盖有效的登录状态
    if (isLoggedIn !== wx.getStorageSync('isLoggedIn')) {
      wx.setStorageSync('isLoggedIn', isLoggedIn);
      wx.setStorageSync('isGuestMode', !isLoggedIn);
    }

    this.globalData.isLoggedIn = isLoggedIn;
    this.globalData.isGuestMode = !isLoggedIn;
  },

  initSeniorMode() {
    const isSeniorMode = wx.getStorageSync('seniorMode') || false;
    wx.setStorageSync('seniorMode', isSeniorMode);
    this.globalData.isSeniorMode = isSeniorMode;
  },

  toggleSeniorMode() {
    const currentMode = wx.getStorageSync('seniorMode') || false;
    const newMode = !currentMode;
    wx.setStorageSync('seniorMode', newMode);
    this.globalData.isSeniorMode = newMode;
    return newMode;
  },

  initNotificationManager() {
    const notificationManager = NotificationManager.getInstance();
    notificationManager.init();
  },

  startNotificationManager() {
    const notificationManager = NotificationManager.getInstance();
    notificationManager.startLocalCheck();
  },

  stopNotificationManager() {
    const notificationManager = NotificationManager.getInstance();
    notificationManager.stopLocalCheck();
  },

  initSyncManager() {
    const mode = DataManager.getCurrentMode();
    if (!mode.isGuestMode) {
      SyncManager.init(5); // 每5分钟自动同步一次
    }
  },

  startSyncManager() {
    const mode = DataManager.getCurrentMode();
    if (!mode.isGuestMode) {
      SyncManager.syncData(); // 立即执行一次同步
    }
  },

  stopSyncManager() {
    // 不停止同步管理器，保持后台同步
  },

  initEventChannel() {
    // 初始化全局事件通道
    this.globalData.eventChannel = {
      listeners: {},
      on(event, callback) {
        if (!this.listeners[event]) {
          this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
      },
      off(event, callback) {
        if (!this.listeners[event]) return;
        if (callback) {
          this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        } else {
          delete this.listeners[event];
        }
      },
      emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            // 事件回调执行失败
          }
        });
      }
    };
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    eventChannel: null
  }
});