const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    statusBarHeight: 0,

    // 订阅消息状态
    expirySubscribed: false,
    medicationSubscribed: false,
    templates: {
      expiry: '',
      medication: ''
    },

    reminderSettings: {
      pushEnabled: true,
      reminderTime: 15,
      expiryWarningDays: 30
    },
    
    reminderTimes: [
      { label: '提前5分钟', value: 5 },
      { label: '提前10分钟', value: 10 },
      { label: '提前15分钟', value: 15 },
      { label: '提前30分钟', value: 30 }
    ],
    
    expiryWarningDays: [
      { label: '提前7天', value: 7 },
      { label: '提前15天', value: 15 },
      { label: '提前30天', value: 30 },
      { label: '提前60天', value: 60 }
    ],

    // 选择器显示状态
    showReminderTimeSheet: false,
    showExpiryWarningSheet: false,
    reminderTimeLabel: '提前15分钟',
    expiryWarningLabel: '提前30天'
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.loadSettings();
    this.loadSubscriptions();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.loadSettings();
    this.loadSubscriptions();
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    this.setData({
      isLoggedIn: mode.isLoggedIn
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

  loadSettings: function() {
    const savedSettings = wx.getStorageSync('reminderSettings') || {};
    
    const reminderTime = savedSettings.reminderTime || 15;
    const expiryWarningDays = savedSettings.expiryWarningDays || 30;

    this.setData({
      reminderSettings: {
        pushEnabled: savedSettings.pushEnabled !== undefined ? savedSettings.pushEnabled : true,
        reminderTime: reminderTime,
        expiryWarningDays: expiryWarningDays
      }
    });

    this.updateLabels();

    // 如果已登录，从服务器加载设置
    if (this.data.isLoggedIn) {
      DataManager.getNotificationSettings().then(res => {
        if (res.code === 0) {
          this.setData({
            'reminderSettings.reminderTime': res.data.reminder_time,
            'reminderSettings.expiryWarningDays': res.data.expiry_warning_days
          });
          this.updateLabels();
        }
      }).catch(error => {
        // 加载服务器设置失败
      });
    }
  },

  updateLabels: function() {
    const reminderTime = this.data.reminderSettings.reminderTime;
    const expiryWarningDays = this.data.reminderSettings.expiryWarningDays;

    const reminderTimeItem = this.data.reminderTimes.find(item => item.value === reminderTime);
    const expiryWarningItem = this.data.expiryWarningDays.find(item => item.value === expiryWarningDays);

    this.setData({
      reminderTimeLabel: reminderTimeItem ? reminderTimeItem.label : '提前15分钟',
      expiryWarningLabel: expiryWarningItem ? expiryWarningItem.label : '提前30天'
    });
  },

  onPushEnabledChange: function(e) {
    this.setData({
      'reminderSettings.pushEnabled': e.detail
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
    this.updateLabels();
  },

  onReminderTimeChange: function(e) {
    this.setData({
      'reminderSettings.reminderTime': e.detail
    });
    this.updateLabels();
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
    this.updateLabels();
  },

  onExpiryWarningDaysChange: function(e) {
    this.setData({
      'reminderSettings.expiryWarningDays': e.detail
    });
    this.updateLabels();
  },

  onSave: function() {
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    // 保存到本地
    wx.setStorageSync('reminderSettings', this.data.reminderSettings);

    // 如果已登录，保存到服务器
    if (this.data.isLoggedIn) {
      DataManager.saveNotificationSettings({
        reminderTime: this.data.reminderSettings.reminderTime,
        expiryWarningDays: this.data.reminderSettings.expiryWarningDays
      }).then(res => {
        wx.hideLoading();
        if (res.code === 0) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      }).catch(error => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
    } else {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
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
              reminderTime: 15,
              expiryWarningDays: 30
            }
          });
          this.updateLabels();
          wx.showToast({
            title: '已重置',
            icon: 'success'
          });
        }
      }
    });
  },

  onClearHistory: function() {
    wx.showModal({
      title: '清除通知历史',
      content: '确定要清除所有通知历史记录吗？',
      confirmText: '清除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的过期提醒记录
          const storage = wx.getStorageInfoSync();
          storage.keys.forEach(key => {
            if (key.startsWith('expiry_notify_')) {
              wx.removeStorageSync(key);
            }
          });

          wx.showToast({
            title: '已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 加载订阅状态
   */
  loadSubscriptions: function() {
    if (!this.data.isLoggedIn) {
      return;
    }

    DataManager.getSubscriptions().then(res => {
      if (res.code === 0) {
        const subscriptions = res.data.subscriptions;
        const expirySubscribed = subscriptions.some(s => s.template_type === 'expiry' && s.is_active);
        const medicationSubscribed = subscriptions.some(s => s.template_type === 'medication' && s.is_active);

        this.setData({
          expirySubscribed,
          medicationSubscribed,
          templates: res.data.templates
        });
      }
    }).catch(error => {
      // 加载订阅状态失败
    });
  },

  /**
   * 订阅过期提醒
   */
  onSubscribeExpiry: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const templateId = this.data.templates.expiry;
    
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          DataManager.subscribeNotification('expiry').then(() => {
            wx.showToast({
              title: '订阅成功',
              icon: 'success'
            });
            this.loadSubscriptions();
          }).catch(error => {
            wx.showToast({
              title: '订阅失败',
              icon: 'none'
            });
          });
        } else if (res[templateId] === 'reject') {
          wx.showToast({
            title: '您拒绝了订阅',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.showToast({
          title: '请求订阅失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 订阅用药提醒
   */
  onSubscribeMedication: function() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const templateId = this.data.templates.medication;
    
    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        if (res[templateId] === 'accept') {
          DataManager.subscribeNotification('medication').then(() => {
            wx.showToast({
              title: '订阅成功',
              icon: 'success'
            });
            this.loadSubscriptions();
          }).catch(error => {
            wx.showToast({
              title: '订阅失败',
              icon: 'none'
            });
          });
        } else if (res[templateId] === 'reject') {
          wx.showToast({
            title: '您拒绝了订阅',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.showToast({
          title: '请求订阅失败',
          icon: 'none'
        });
      }
    });
  },


});
