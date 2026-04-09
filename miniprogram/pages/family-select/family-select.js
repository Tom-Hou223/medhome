const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    families: [],
    loading: true,
    showCreateDialog: false,
    showJoinDialog: false,
    familyName: '',
    inviteCode: '',
    statusBarHeight: 0
  },

  onLoad: function() {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    });
    this.loadFamilies();
  },

  onShow: function() {
    // 每次显示时刷新家庭列表
    this.loadFamilies();
  },

  async loadFamilies() {
    this.setData({ loading: true });

    try {
      const families = await DataManager.getMyFamilies();
      this.setData({
        families,
        loading: false
      });

      // 移除自动选择逻辑，让用户手动选择
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  selectFamily(family) {
    DataManager.setCurrentFamily(family);
    
    // 清除旧的缓存数据
    wx.removeStorageSync('cache_medicines');
    wx.removeStorageSync('cache_plans');
    wx.removeStorageSync('cache_familyMembers');
    wx.removeStorageSync('cache_records');
    
    wx.showToast({
      title: `已切换到${family.name}`,
      icon: 'success'
    });

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 1500);
  },

  onFamilyTap(e) {
    const { family } = e.currentTarget.dataset;
    this.selectFamily(family);
  },

  showCreateDialog() {
    this.setData({
      showCreateDialog: true,
      familyName: ''
    });
  },

  hideCreateDialog() {
    this.setData({ showCreateDialog: false });
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail });
  },

  async onCreateFamily() {
    const { familyName } = this.data;

    if (!familyName || familyName.trim() === '') {
      wx.showToast({
        title: '请输入家庭名称',
        icon: 'none'
      });
      return Promise.reject();
    }

    wx.showLoading({
      title: '创建中...',
      mask: true
    });

    try {
      const family = await DataManager.createFamily(familyName.trim());
      wx.hideLoading();

      wx.showToast({
        title: '创建成功',
        icon: 'success'
      });

      this.hideCreateDialog();

      // 自动选择新创建的家庭
      setTimeout(() => {
        this.selectFamily(family);
      }, 1500);

      return Promise.resolve();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '创建失败',
        icon: 'none'
      });
      return Promise.reject();
    }
  },

  showJoinDialog() {
    this.setData({
      showJoinDialog: true,
      inviteCode: ''
    });
  },

  hideJoinDialog() {
    this.setData({ showJoinDialog: false });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.toUpperCase() });
  },

  async onJoinFamily() {
    const { inviteCode } = this.data;

    if (!inviteCode || inviteCode.trim() === '') {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return Promise.reject();
    }

    wx.showLoading({
      title: '加入中...',
      mask: true
    });

    try {
      const result = await DataManager.joinFamily(inviteCode.trim());
      wx.hideLoading();

      wx.showToast({
        title: '加入成功',
        icon: 'success'
      });

      this.hideJoinDialog();

      // 重新加载家庭列表
      setTimeout(() => {
        this.loadFamilies();
      }, 1500);

      return Promise.resolve();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '加入失败',
        icon: 'none'
      });
      return Promise.reject();
    }
  }
});
