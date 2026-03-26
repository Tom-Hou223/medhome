const DataManager = require('../../utils/dataManager.js');
const NotificationManager = require('../../utils/notificationManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    seniorTheme: 'white', // 'yellow' 或 'white'
    showThemeSheet: false,
    statusBarHeight: 0,
    
    loading: false,
    notificationAuthorized: false, // 通知权限状态
    
    reminderSettings: {
      pushEnabled: true,
      notificationType: 'wechat',
      reminderTime: '15',
      expiryWarningDays: '30',
      doNotDisturb: false,
      doNotDisturbStart: '22:00',
      doNotDisturbEnd: '08:00'
    },
    
    notificationTypes: [
      { label: '微信通知', value: 'wechat' },
      { label: '应用内提醒', value: 'app' }
    ],
    
    reminderTimes: [
      { label: '提前5分钟', value: '5' },
      { label: '提前10分钟', value: '10' },
      { label: '提前15分钟', value: '15' },
      { label: '提前30分钟', value: '30' }
    ],

    expiryWarningDays: [
      { label: '提前7天', value: '7' },
      { label: '提前15天', value: '15' },
      { label: '提前30天', value: '30' },
      { label: '提前60天', value: '60' }
    ],

    // 选择器显示状态
    showNotificationTypeSheet: false,
    showReminderTimeSheet: false,
    showExpiryWarningSheet: false,
    showTimePicker: false,
    expiryWarningLabel: '提前30天'
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadSettings();
    this.checkNotificationPermission();
    this.updateTabBar();
  },

  onShow: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadSettings();
    this.checkNotificationPermission();
    this.updateTabBar();
  },

  updateTabBar: function() {
    // 设置页面不在tabBar中，无需更新
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode
    });
  },

  getSystemInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          statusBarHeight: res.statusBarHeight
        });
      }
    });
  },

  initSeniorMode: function() {
    const isSeniorMode = wx.getStorageSync('seniorMode') || false;
    const seniorTheme = wx.getStorageSync('seniorTheme') || 'white';
    this.setData({
      isSeniorMode: isSeniorMode,
      seniorTheme: seniorTheme
    });
  },

  loadSettings: function() {
    // 从本地存储加载设置
    const savedSettings = wx.getStorageSync('reminderSettings');
    
    if (savedSettings) {
      this.setData({
        reminderSettings: {
          pushEnabled: savedSettings.pushEnabled !== undefined ? savedSettings.pushEnabled : true,
          notificationType: savedSettings.notificationType || 'wechat',
          reminderTime: savedSettings.reminderTime || '15',
          expiryWarningDays: savedSettings.expiryWarningDays || '30',
          doNotDisturb: savedSettings.doNotDisturb || false,
          doNotDisturbStart: savedSettings.doNotDisturbStart || '22:00',
          doNotDisturbEnd: savedSettings.doNotDisturbEnd || '08:00'
        }
      });
    } else {
      // 使用默认设置
      this.setData({
        reminderSettings: {
          pushEnabled: true,
          notificationType: 'wechat',
          reminderTime: '15',
          expiryWarningDays: '30',
          doNotDisturb: false,
          doNotDisturbStart: '22:00',
          doNotDisturbEnd: '08:00'
        }
      });
    }
    this.updateExpiryWarningLabel();
  },

  onPushEnabledChange: function(e) {
    this.setData({
      'reminderSettings.pushEnabled': e.detail
    });
  },

  showNotificationTypePicker: function() {
    this.setData({
      showNotificationTypeSheet: true
    });
  },

  onCloseNotificationTypeSheet: function() {
    this.setData({
      showNotificationTypeSheet: false
    });
  },

  selectNotificationType: function(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'reminderSettings.notificationType': value,
      showNotificationTypeSheet: false
    });
  },

  onNotificationTypeChange: function(e) {
    this.setData({
      'reminderSettings.notificationType': e.detail
    });
  },

  showReminderTimePicker: function() {
    this.setData({
      showReminderTimeSheet: true
    });
  },

  onCloseReminderTimeSheet: function() {
    this.setData({
      showReminderTimeSheet: false
    });
  },

  selectReminderTime: function(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'reminderSettings.reminderTime': value,
      showReminderTimeSheet: false
    });
  },

  onReminderTimeChange: function(e) {
    this.setData({
      'reminderSettings.reminderTime': e.detail
    });
  },

  showExpiryWarningPicker: function() {
    this.setData({
      showExpiryWarningSheet: true
    });
  },

  onCloseExpiryWarningSheet: function() {
    this.setData({
      showExpiryWarningSheet: false
    });
  },

  selectExpiryWarning: function(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'reminderSettings.expiryWarningDays': value,
      showExpiryWarningSheet: false
    });
    this.updateExpiryWarningLabel();
  },

  onExpiryWarningDaysChange: function(e) {
    this.setData({
      'reminderSettings.expiryWarningDays': e.detail
    });
    this.updateExpiryWarningLabel();
  },

  updateExpiryWarningLabel: function() {
    const expiryWarningDays = this.data.reminderSettings.expiryWarningDays;
    const expiryWarningItem = this.data.expiryWarningDays.find(item => item.value === expiryWarningDays);
    this.setData({
      expiryWarningLabel: expiryWarningItem ? expiryWarningItem.label : '提前30天'
    });
  },

  onDoNotDisturbChange: function(e) {
    this.setData({
      'reminderSettings.doNotDisturb': e.detail
    });
  },

  showTimePicker: function() {
    this.setData({
      showTimePicker: true
    });
  },

  onCloseTimePicker: function() {
    this.setData({
      showTimePicker: false
    });
  },

  confirmTimePicker: function() {
    this.setData({
      showTimePicker: false
    });
  },

  onStartTimeChange: function(e) {
    this.setData({
      'reminderSettings.doNotDisturbStart': e.detail.value
    });
  },

  onEndTimeChange: function(e) {
    this.setData({
      'reminderSettings.doNotDisturbEnd': e.detail.value
    });
  },

  onSave: function() {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    try {
      // 保存到本地存储
      wx.setStorageSync('reminderSettings', this.data.reminderSettings);
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  onReset: function() {
    wx.showModal({
      title: '确认重置',
      content: '确定要恢复默认设置吗？',
      confirmText: '重置',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            reminderSettings: {
              pushEnabled: true,
              notificationType: 'wechat',
              reminderTime: '15',
              expiryWarningDays: '30',
              doNotDisturb: false,
              doNotDisturbStart: '22:00',
              doNotDisturbEnd: '08:00'
            }
          });
          this.updateExpiryWarningLabel();
        }
      }
    });
  },
  
  /**
   * 检查通知权限状态
   */
  checkNotificationPermission: function() {
    // 使用微信API查询订阅消息授权状态
    const tmplIds = [
      'pYTIFUgvO40l0ZnQ3Miy6P5x_VpYUF5GY_NuuvkxeLE',
      'S07bmEbAECl0mAdvmz4RRFsUh8sDLvVOTtvLx7vyL7A'
    ];
    
    wx.getSetting({
      withSubscriptions: true,
      success: (res) => {
        
        // 检查是否有任何模板被授权
        let hasAuthorized = false;
        if (res.subscriptionsSetting && res.subscriptionsSetting.itemSettings) {
          tmplIds.forEach(id => {
            if (res.subscriptionsSetting.itemSettings[id] === 'accept') {
              hasAuthorized = true;
            }
          });
        }
        
        this.setData({
          notificationAuthorized: hasAuthorized
        });
      },
      fail: (err) => {
        this.setData({
          notificationAuthorized: false
        });
      }
    });
  },

  /**
   * 请求通知权限
   */
  requestNotificationPermission: function() {
    wx.showModal({
      title: '通知权限',
      content: '为了及时收到用药提醒和药品过期通知，需要您授权通知权限。',
      confirmText: '授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const notificationManager = NotificationManager.getInstance();
          notificationManager.requestNotificationPermission(
            (successRes) => {
              
              // 检查是否至少有一个模板被授权
              const tmplIds = [
                'pYTIFUgvO40l0ZnQ3Miy6P5x_VpYUF5GY_NuuvkxeLE',
                'S07bmEbAECl0mAdvmz4RRFsUh8sDLvVOTtvLx7vyL7A'
              ];
              
              let hasAuthorized = false;
              tmplIds.forEach(id => {
                if (successRes[id] === 'accept') {
                  hasAuthorized = true;
                }
              });
              
              if (hasAuthorized) {
                wx.showToast({
                  title: '授权成功',
                  icon: 'success'
                });
                
                // 重新检查授权状态
                setTimeout(() => {
                  this.checkNotificationPermission();
                }, 500);
              } else {
                wx.showToast({
                  title: '您拒绝了授权',
                  icon: 'none'
                });
              }
            },
            (errorRes) => {
              wx.showToast({
                title: '授权失败',
                icon: 'none',
                duration: 2000
              });
            }
          );
        }
      }
    });
  },

  // 老年模式切换
  onSeniorModeChange: function(e) {
    const isSeniorMode = e.detail;
    this.setData({
      isSeniorMode: isSeniorMode
    });
    
    // 保存到本地存储
    wx.setStorageSync('seniorMode', isSeniorMode);
    
    // 提示用户
    wx.showToast({
      title: isSeniorMode ? '已开启老年模式' : '已关闭老年模式',
      icon: 'success',
      duration: 2000
    });

    // 延迟刷新以应用新布局
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/settings/settings'
      });
    }, 2000);
  },

  // 显示主题选择器
  showThemePicker: function() {
    this.setData({
      showThemeSheet: true
    });
  },

  // 关闭主题选择器
  onCloseThemeSheet: function() {
    this.setData({
      showThemeSheet: false
    });
  },

  // 选择主题
  selectTheme: function(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      seniorTheme: value,
      showThemeSheet: false
    });
    
    // 保存到本地存储
    wx.setStorageSync('seniorTheme', value);
    
    wx.showToast({
      title: value === 'yellow' ? '已切换到黑底黄字' : '已切换到白底黑字',
      icon: 'success',
      duration: 2000
    });

    // 延迟刷新以应用新主题
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/settings/settings'
      });
    }, 2000);
  },

  // 主题变化
  onThemeChange: function(e) {
    this.setData({
      seniorTheme: e.detail
    });
  },

  // 更新tabBar
  updateTabBar: function() {
    const app = getApp();
    if (app.updateTabBar) {
      app.updateTabBar();
    }
  },

  /**
   * 恢复默认游客数据
   */
  onRestoreGuestData: function() {
    wx.showModal({
      title: '恢复默认数据',
      content: '确定要恢复默认的游客数据吗？这将会清除当前的游客数据。',
      success: (res) => {
        if (res.confirm) {
          // 清除现有的游客数据
          DataManager.clearGuestData();
          
          // 显示成功提示
          wx.showToast({
            title: '已恢复默认数据',
            icon: 'success'
          });
          
          // 切换到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});