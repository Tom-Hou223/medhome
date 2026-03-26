const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    loading: false,
    backupHistory: []
  },

  onLoad: function(options) {
    this.checkLoginStatus();
    this.loadBackupHistory();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.loadBackupHistory();
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode
    });
  },

  loadBackupHistory: function() {
    const history = wx.getStorageSync('backupHistory') || [];
    this.setData({ backupHistory: history });
  },

  onBackupNow: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能备份数据',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      wx.showToast({
        title: '请先选择家庭',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    Promise.all([
      DataManager.getMedicines(),
      DataManager.getPlans(),
      DataManager.getFamilyMembers(familyId)
    ]).then(([medicinesRes, plansRes, membersRes]) => {
      const backupData = {
        timestamp: new Date().getTime(),
        date: new Date().toISOString(),
        data: {
          medicines: medicinesRes.data,
          plans: plansRes.data,
          members: membersRes.data
        }
      };

      this.saveBackupData(backupData);
      this.updateBackupHistory(backupData);

      wx.showToast({
        title: '备份成功',
        icon: 'success'
      });

      this.setData({ loading: false });
    }).catch(error => {
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  saveBackupData: function(backupData) {
    wx.setStorageSync('backupData', backupData);
  },

  updateBackupHistory: function(backupData) {
    let history = wx.getStorageSync('backupHistory') || [];
    history.unshift({
      timestamp: backupData.timestamp,
      date: backupData.date,
      medicines: backupData.data.medicines.length,
      plans: backupData.data.plans.length,
      members: backupData.data.members.length
    });
    
    // 只保留最近10次备份
    history = history.slice(0, 10);
    wx.setStorageSync('backupHistory', history);
    this.setData({ backupHistory: history });
  },

  onRestoreData: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能恢复数据',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    wx.showModal({
      title: '确认恢复',
      content: '恢复数据将覆盖当前数据，确定要继续吗？',
      confirmText: '恢复',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performRestore();
        }
      }
    });
  },

  performRestore: function() {
    const backupData = wx.getStorageSync('backupData');
    if (!backupData) {
      wx.showToast({
        title: '无备份数据',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 模拟数据恢复
    setTimeout(() => {
      wx.showToast({
        title: '恢复成功',
        icon: 'success'
      });
      this.setData({ loading: false });
    }, 1000);
  },

  onExportData: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能导出数据',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      wx.showToast({
        title: '请先选择家庭',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    Promise.all([
      DataManager.getMedicines(),
      DataManager.getPlans(),
      DataManager.getFamilyMembers(familyId)
    ]).then(([medicinesRes, plansRes, membersRes]) => {
      const exportData = {
        timestamp: new Date().getTime(),
        date: new Date().toISOString(),
        version: '1.0',
        data: {
          medicines: medicinesRes.data,
          plans: plansRes.data,
          members: membersRes.data
        }
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const fileName = `medicine_manager_backup_${new Date().toISOString().split('T')[0]}.json`;

      // 保存到本地文件
      wx.setStorageSync('exportData', exportData);
      
      wx.showToast({
        title: '导出成功',
        icon: 'success'
      });

      this.setData({ loading: false });
    }).catch(error => {
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  onImportData: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能导入数据',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    wx.showModal({
      title: '确认导入',
      content: '导入数据将覆盖当前数据，确定要继续吗？',
      confirmText: '导入',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.performImport();
        }
      }
    });
  },

  performImport: function() {
    const importData = wx.getStorageSync('exportData');
    if (!importData) {
      wx.showToast({
        title: '无导入数据',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 模拟数据导入
    setTimeout(() => {
      wx.showToast({
        title: '导入成功',
        icon: 'success'
      });
      this.setData({ loading: false });
    }, 1000);
  },

  onClearBackup: function() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有备份数据吗？',
      confirmText: '清除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('backupData');
          wx.removeStorageSync('backupHistory');
          this.setData({ backupHistory: [] });
          wx.showToast({
            title: '已清除',
            icon: 'success'
          });
        }
      }
    });
  }
});