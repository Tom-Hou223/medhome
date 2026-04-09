const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    loading: false,
    phone: '',
    nickname: '',
    password: '',
    phoneLoading: false,
    rememberMe: false,
    statusBarHeight: 0,
    showPassword: false,
    phoneError: '',
    nicknameError: '',
    passwordError: '',
    activeTab: 'phone'
  },

  onLoad: function() {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    });
    this.checkLoginStatus();
    // 尝试从本地存储获取记住的账号密码
    this.loadRememberedCredentials();
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    if (mode.isLoggedIn) {
      // 无论是否有家庭，都跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 加载记住的账号密码
  loadRememberedCredentials: function() {
    const remembered = wx.getStorageSync('rememberedCredentials');
    if (remembered) {
      this.setData({
        phone: remembered.phone,
        password: remembered.password,
        rememberMe: true
      });
    }
  },

  // 切换登录方式
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab,
      phoneError: '',
      nicknameError: '',
      passwordError: ''
    });
  },

  // 昵称输入
  onNicknameInput: function(e) {
    const nickname = e.detail.value || e.detail || '';
    this.setData({
      nickname: nickname
    });
    // 实时验证昵称
    this.validateNickname(nickname);
  },

  // 验证昵称
  validateNickname: function(nickname) {
    if (!nickname || nickname.trim() === '') {
      this.setData({ nicknameError: '' });
      return false;
    }
    if (nickname.length < 2 || nickname.length > 20) {
      this.setData({ nicknameError: '昵称长度应在2-20个字符之间' });
      return false;
    }
    this.setData({ nicknameError: '' });
    return true;
  },

  onWeChatLogin: async function() {
    this.setData({ loading: true });

    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    try {
      // 1. 调用微信登录获取code
      const loginRes = await this.wxLogin();

      // 2. 直接使用code登录，后端会处理用户信息获取
      const loginData = await DataManager.login(loginRes.code);

      wx.hideLoading();

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 检查是否有家庭，如果没有或未选择家庭，则跳转到家庭选择页面
      const currentFamily = DataManager.getCurrentFamily();
      const hasFamilies = loginData.hasFamily && loginData.families && loginData.families.length > 0;
      
      setTimeout(() => {
        if (!currentFamily || !currentFamily.id) {
          if (hasFamilies) {
            // 有家庭但未选择，跳转到家庭选择页面
            wx.redirectTo({
              url: '/pages/family-select/family-select'
            });
          } else {
            // 没有家庭，先跳转到首页，用户可以在我的页面创建或选择家庭
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        } else {
          // 已选择家庭，直接跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }, 1500);

    } catch (error) {
      wx.hideLoading();

      wx.showModal({
        title: '登录失败',
        content: error.message || '登录失败，请稍后重试',
        showCancel: false
      });

      this.setData({ loading: false });
    }
  },

  // 封装wx.login为Promise
  wxLogin: function() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    });
  },

  // 手机号输入
  onPhoneInput: function(e) {
    const phone = e.detail.value || e.detail || '';
    this.setData({
      phone: phone
    });
    // 实时验证手机号
    this.validatePhone(phone);
  },

  // 密码输入
  onPasswordInput: function(e) {
    const password = e.detail.value || e.detail || '';
    this.setData({
      password: password
    });
    // 实时验证密码
    this.validatePassword(password);
  },

  // 验证手机号
  validatePhone: function(phone) {
    if (!phone || phone.trim() === '') {
      this.setData({ phoneError: '' });
      return false;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      this.setData({ phoneError: '请输入正确的手机号' });
      return false;
    }
    this.setData({ phoneError: '' });
    return true;
  },

  // 验证密码
  validatePassword: function(password) {
    if (!password || password.trim() === '') {
      this.setData({ passwordError: '' });
      return false;
    }
    if (password.length < 6 || password.length > 20) {
      this.setData({ passwordError: '密码长度应在6-20个字符之间' });
      return false;
    }
    this.setData({ passwordError: '' });
    return true;
  },

  // 切换密码可见性
  togglePassword: function() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 登录
  onLogin: function() {
    const { activeTab, phone, nickname, password } = this.data;
    let isValid = false;
    
    // 根据当前tab验证表单
    if (activeTab === 'phone') {
      isValid = this.validatePhone(phone) && this.validatePassword(password);
    } else {
      isValid = this.validateNickname(nickname) && this.validatePassword(password);
    }
    
    if (!isValid) {
      return;
    }

    this.setData({ phoneLoading: true });

    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 根据当前tab调用不同的登录接口
    let loginPromise;
    if (activeTab === 'phone') {
      loginPromise = DataManager.loginByPhone(phone.trim(), password);
    } else {
      loginPromise = DataManager.loginByNickname(nickname.trim(), password);
    }

    loginPromise.then(loginData => {
      wx.hideLoading();
      this.setData({ phoneLoading: false });

      // 保存记住的账号密码
      if (this.data.rememberMe) {
        wx.setStorageSync('rememberedCredentials', {
          phone: activeTab === 'phone' ? phone.trim() : '',
          password: password
        });
      } else {
        wx.removeStorageSync('rememberedCredentials');
      }

      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

      // 检查是否有家庭，如果没有或未选择家庭，则跳转到家庭选择页面
      const currentFamily = DataManager.getCurrentFamily();
      const hasFamilies = loginData.hasFamily && loginData.families && loginData.families.length > 0;
      
      setTimeout(() => {
        if (!currentFamily || !currentFamily.id) {
          if (hasFamilies) {
            // 有家庭但未选择，跳转到家庭选择页面
            wx.redirectTo({
              url: '/pages/family-select/family-select'
            });
          } else {
            // 没有家庭，先跳转到首页，用户可以在我的页面创建或选择家庭
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        } else {
          // 已选择家庭，直接跳转到首页
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }, 1500);

    }).catch(error => {
      wx.hideLoading();
      this.setData({ phoneLoading: false });

      // 登录失败，显示错误提示
      wx.showToast({
        title: '登录失败，请检查账号密码或网络连接',
        icon: 'none'
      });
    });
  },

  // 游客模式登录（可选）
  onGuestLogin: function() {
    wx.showModal({
      title: '提示',
      content: '游客模式下数据仅保存在本地，无法与家人共享。建议使用微信登录。',
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          DataManager.switchToGuestMode();
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  // 跳转到注册页
  navigateToRegister: function() {
    wx.redirectTo({
      url: '/pages/register/register'
    });
  },

  // 记住我选项变更
  onRememberChange: function(e) {
    this.setData({
      rememberMe: e.detail
    });
  },

  // 忘记密码
  onForgotPassword: function() {
    wx.showToast({
      title: '忘记密码功能开发中',
      icon: 'none'
    });
  },

  // 显示用户协议
  showUserAgreement: function() {
    wx.showModal({
      title: '用户协议',
      content: '欢迎使用药效记！本协议是您与药效记之间的法律协议。请您务必审慎阅读、充分理解本协议各条款内容...',
      showCancel: true,
      confirmText: '同意',
      cancelText: '取消'
    });
  },

  // 显示隐私政策
  showPrivacyPolicy: function() {
    wx.showModal({
      title: '隐私政策',
      content: '药效记致力于保护您的隐私。本政策描述了我们如何收集、使用、存储和保护您的个人信息...',
      showCancel: true,
      confirmText: '同意',
      cancelText: '取消'
    });
  }
});
