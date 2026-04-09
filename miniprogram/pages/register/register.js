const DataManager = require('../../utils/dataManager');

Page({
  data: {
    phone: '',
    nickname: '',
    password: '',
    loading: false,
    statusBarHeight: 0,
    phoneError: '',
    nicknameError: '',
    passwordError: ''
  },

  onLoad: function() {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
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

  // 昵称输入
  onNicknameInput: function(e) {
    const nickname = e.detail.value || e.detail || '';
    this.setData({
      nickname: nickname
    });
    // 实时验证昵称
    this.validateNickname(nickname);
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

  // 注册
  onRegister: function() {
    const phone = this.data.phone;
    const nickname = this.data.nickname;
    const password = this.data.password;
    
    // 验证表单
    const isPhoneValid = this.validatePhone(phone);
    const isNicknameValid = this.validateNickname(nickname);
    const isPasswordValid = this.validatePassword(password);
    
    if (!isPhoneValid || !isNicknameValid || !isPasswordValid) {
      return;
    }

    this.setData({ loading: true });

    wx.showLoading({
      title: '注册中...',
      mask: true
    });

    // 调用后端手机号登录/注册接口
    DataManager.loginByPhone(phone.trim(), this.data.password).then(loginData => {
      wx.hideLoading();
      this.setData({ loading: false });

      // 如果是新用户，更新昵称
      if (loginData.isNewUser) {
        DataManager.updateProfile({ nickname: nickname.trim() }).then(() => {
          wx.showToast({
            title: '注册成功',
            icon: 'success'
          });

          // 检查是否有家庭
          setTimeout(() => {
            if (loginData.hasFamily && loginData.families && loginData.families.length > 0) {
              wx.switchTab({
                url: '/pages/index/index'
              });
            } else {
              // 不强制跳转到家庭选择，直接进入首页
              // 用户可以在首页或个人中心中选择加入家庭
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          }, 1500);
        }).catch(error => {
          console.error('更新昵称失败:', error);
          wx.showToast({
            title: '注册成功，但更新昵称失败',
            icon: 'none'
          });

          // 继续跳转到首页
          setTimeout(() => {
            if (loginData.hasFamily && loginData.families && loginData.families.length > 0) {
              wx.switchTab({
                url: '/pages/index/index'
              });
            } else {
              // 不强制跳转到家庭选择，直接进入首页
              // 用户可以在首页或个人中心中选择加入家庭
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          }, 1500);
        });
      } else {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 检查是否有家庭
          setTimeout(() => {
            if (loginData.hasFamily && loginData.families && loginData.families.length > 0) {
              wx.switchTab({
                url: '/pages/index/index'
              });
            } else {
              // 不强制跳转到家庭选择，直接进入首页
              // 用户可以在首页或个人中心中选择加入家庭
              wx.switchTab({
                url: '/pages/index/index'
              });
            }
          }, 1500);
      }

    }).catch(error => {
      wx.hideLoading();
      this.setData({ loading: false });

      wx.showModal({
        title: '注册失败',
        content: error.message || '请检查网络连接或稍后重试',
        showCancel: false
      });
    });
  },

  // 跳转到登录页
  navigateToLogin: function() {
    wx.redirectTo({
      url: '/pages/login/login'
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