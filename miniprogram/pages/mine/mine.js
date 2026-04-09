const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    seniorTheme: 'white',
    statusBarHeight: 0,

    userInfo: {
      avatar: '',
      nickname: '游客',
      phone: ''
    },

    currentFamily: null,

    menuList: [
      {
        icon: 'manager-o',
        title: '家庭管理',
        url: '/pages/family-manage/family-manage',
        needLogin: true
      },
      {
        icon: 'friends-o',
        title: '家庭成员',
        url: '/pages/family/family'
      },
      {
        icon: 'chart-trending-o',
        title: '数据统计',
        url: '/pages/statistics/statistics'
      },
      {
        icon: 'setting-o',
        title: '系统设置',
        url: '/pages/settings/settings'
      },
      {
        icon: 'info-o',
        title: '关于我们',
        url: '/pages/about/about'
      },
      {
        icon: 'service-o',
        title: '帮助与反馈',
        url: '/pages/feedback/feedback'
      }
    ]
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadUserInfo();
    this.loadCurrentFamily();
    this.updateTabBar();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadUserInfo();
    this.loadCurrentFamily();
    this.updateTabBar();
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

  updateTabBar: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const isSeniorMode = wx.getStorageSync('seniorMode') || false;
      this.getTabBar().setData({
        selected: isSeniorMode ? 1 : 3
      });
      this.getTabBar().updateTabBar();
    }
  },

  async loadUserInfo() {
    if (this.data.isGuestMode) {
      this.setData({
        userInfo: {
          avatar: '',
          nickname: '游客',
          phone: ''
        }
      });
      return;
    }

    try {
      console.log('开始加载用户信息');
      const userInfo = await DataManager.getProfile();
      console.log('获取到用户信息:', userInfo);
      
      // 处理头像 URL
      let avatarUrl = userInfo.avatarUrl || '';
      console.log('原始头像URL:', avatarUrl);
      
      if (avatarUrl) {
        // 使用正确的服务器 IP 地址
        const serverBaseUrl = 'http://192.168.31.90:3001';
        console.log('服务器基础URL:', serverBaseUrl);
        
        // 如果是相对路径，添加完整的服务器地址
        if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('uploads/')) {
          avatarUrl = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl;
          avatarUrl = serverBaseUrl + avatarUrl + '?t=' + Date.now();
          console.log('构建后的头像URL (相对路径):', avatarUrl);
        }
        // 如果已经是完整 URL，直接使用
        else if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
          avatarUrl = serverBaseUrl + '/' + avatarUrl + '?t=' + Date.now();
          console.log('构建后的头像URL (其他路径):', avatarUrl);
        } else {
          console.log('构建后的头像URL (完整路径):', avatarUrl);
        }
      }
      
      console.log('最终头像URL:', avatarUrl);
      
      this.setData({
        userInfo: {
          avatar: avatarUrl,
          nickname: userInfo.nickname || '未设置昵称',
          phone: userInfo.phone || ''
        }
      });
      
      console.log('设置用户信息成功');
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },

  loadCurrentFamily() {
    if (this.data.isGuestMode) {
      this.setData({ currentFamily: null });
      return;
    }

    const family = DataManager.getCurrentFamily();
    this.setData({ currentFamily: family });
  },

  onToggleSeniorMode: function() {
    const newMode = !this.data.isSeniorMode;
    wx.setStorageSync('seniorMode', newMode);
    this.setData({
      isSeniorMode: newMode
    });

    // 更新tabBar
    this.updateTabBar();

    wx.showToast({
      title: newMode ? '已开启老年模式' : '已关闭老年模式',
      icon: 'success',
      duration: 2000
    });

    // 延迟刷新页面以应用新布局
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/mine/mine'
      });
    }, 2000);
  },

  onToggleGuestMode: function(event) {
    const newMode = event.detail;

    if (newMode) {
      // 切换到游客模式（实际上是退出登录）
      wx.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
        confirmText: '确定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.onLogout();
          } else {
            // 取消切换，恢复原状态
            this.setData({
              isGuestMode: !newMode
            });
          }
        }
      });
    } else {
      // 从游客模式切换到登录模式
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  onLogout() {
    DataManager.switchToGuestMode();
    this.setData({
      isLoggedIn: false,
      isGuestMode: true,
      currentFamily: null,
      userInfo: {
        avatar: '',
        nickname: '游客',
        phone: ''
      }
    });

    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });

    // 跳转到登录页
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }, 1500);
  },

  onMenuClick: function(e) {
    const url = e.currentTarget.dataset.url;
    const needLogin = e.currentTarget.dataset.needlogin;
    const title = e.currentTarget.dataset.title;

    // 检查是否需要登录
    if (needLogin && this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能使用此功能',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    // 如果是家庭管理，先检查是否已选择家庭
    if (title === '家庭管理') {
      const family = DataManager.getCurrentFamily();
      if (!family || !family.id) {
        wx.navigateTo({
          url: '/pages/family-select/family-select'
        });
        return;
      }
    }

    wx.navigateTo({
      url: url
    });
  },

  onEditProfile: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能编辑个人信息',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  onFamilyTap() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能管理家庭',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/family-select/family-select'
    });
  }
});