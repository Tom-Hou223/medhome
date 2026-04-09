const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    loading: false,
    statusBarHeight: 0,
    
    currentDate: '',
    selectedDate: '',
    
    filterType: 'all',
    
    todayReminders: [],
    upcomingReminders: [],
    completedReminders: [],
    missedReminders: [],
    
    showDetailDialog: false,
    selectedReminder: null
  },

  onLoad: function(options) {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.initSeniorMode();
    this.initDate();
    this.loadReminders();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadReminders();
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
    this.setData({
      isSeniorMode: isSeniorMode
    });
  },

  initDate: function() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const selectedDate = `${year}-${month}-${day}`;
    this.setData({
      currentDate: today,
      selectedDate: selectedDate
    });
  },

  loadReminders: function() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    Promise.all([
      DataManager.getPlans(),
      DataManager.getRecords(this.data.selectedDate)
    ]).then(([plansRes, recordsRes]) => {
      const plans = plansRes.data;
      const records = recordsRes.data;
      
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      
      const todayReminders = [];
      const upcomingReminders = [];
      const completedReminders = [];
      const missedReminders = [];
      
      plans.forEach(plan => {
        if (plan.status !== 'active') return;
        
        const startDate = new Date(plan.startDate);
        const endDate = plan.endDate ? new Date(plan.endDate) : null;
        
        plan.timeSlots.forEach(timeSlot => {
          const reminder = {
            id: `${plan.id}_${timeSlot}`,
            planId: plan.id,
            medicineName: plan.medicineName,
            memberName: plan.memberName,
            time: timeSlot,
            date: todayStr,
            frequency: plan.frequency,
            notes: plan.notes,
            status: 'pending'
          };
          
          if (startDate > today) {
            upcomingReminders.push(reminder);
          } else if (!endDate || endDate >= today) {
            if (timeSlot <= currentTime) {
              const record = records.find(r => r.planId === plan.id && r.time === timeSlot);
              if (record && record.status === 'completed') {
                reminder.status = 'completed';
                completedReminders.push(reminder);
              } else {
                reminder.status = 'missed';
                missedReminders.push(reminder);
              }
            } else {
              todayReminders.push(reminder);
            }
          }
        });
      });
      
      todayReminders.sort((a, b) => a.time.localeCompare(b.time));
      upcomingReminders.sort((a, b) => a.time.localeCompare(b.time));
      completedReminders.sort((a, b) => b.time.localeCompare(a.time));
      missedReminders.sort((a, b) => b.time.localeCompare(a.time));
      
      this.setData({
        todayReminders,
        upcomingReminders,
        completedReminders,
        missedReminders,
        loading: false
      });
    }).catch(error => {
      console.error('加载提醒列表失败:', error);
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  onFilterChange: function(e) {
    this.setData({
      filterType: e.detail
    });
  },

  onReminderClick: function(e) {
    const reminder = e.currentTarget.dataset.reminder;
    this.setData({
      selectedReminder: reminder,
      showDetailDialog: true
    });
  },

  onMarkCompleted: function() {
    if (!this.data.selectedReminder) return;
    
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能标记提醒',
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
    
    wx.showLoading({
      title: '标记中...',
      mask: true
    });
    
    const record = {
      planId: this.data.selectedReminder.planId,
      medicineName: this.data.selectedReminder.medicineName,
      memberName: this.data.selectedReminder.memberName,
      time: this.data.selectedReminder.time,
      date: this.data.selectedReminder.date,
      status: 'completed'
    };
    
    DataManager.addRecord(record).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '标记成功',
        icon: 'success'
      });
      this.onCloseDetailDialog();
      this.loadReminders();
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '标记失败',
        icon: 'none'
      });
    });
  },

  onSkipReminder: function() {
    if (!this.data.selectedReminder) return;
    
    wx.showModal({
      title: '确认跳过',
      content: '确定要跳过这个提醒吗？',
      confirmText: '跳过',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已跳过',
            icon: 'success'
          });
          this.onCloseDetailDialog();
        }
      }
    });
  },

  onCloseDetailDialog: function() {
    this.setData({
      showDetailDialog: false,
      selectedReminder: null
    });
  },

  onRefresh: function() {
    this.loadReminders();
  },

  onPullDownRefresh: function() {
    this.loadReminders();
    wx.stopPullDownRefresh();
  }
});