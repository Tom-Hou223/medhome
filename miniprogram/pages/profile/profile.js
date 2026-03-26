const DataManager = require('../../utils/dataManager.js');
const errorHandler = require('../../utils/errorHandler.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    statusBarHeight: 0,
    formData: {
      nickname: '',
      avatarUrl: '',
      phone: ''
    },
    tempAvatarPath: '' // 临时头像路径
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.loadUserInfo();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.loadUserInfo();
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

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode
    });
  },

  loadUserInfo: function() {
    if (this.data.isGuestMode) {
      this.setData({
        formData: {
          nickname: '',
          avatarUrl: '',
          phone: ''
        }
      });
      return;
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    DataManager.getProfile().then(userInfo => {
      wx.hideLoading();
      
      // 处理头像 URL，如果是相对路径则添加服务器地址
      let avatarUrl = userInfo.avatarUrl || '';
      if (avatarUrl) {
        // 使用正确的服务器 IP 地址
        const serverBaseUrl = 'http://10.167.79.202:3001';
        // 如果是相对路径，添加完整的服务器地址
        if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('uploads/')) {
          avatarUrl = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl;
          avatarUrl = serverBaseUrl + avatarUrl;
        }
        // 如果已经是完整 URL，直接使用
        else if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
          avatarUrl = serverBaseUrl + '/' + avatarUrl;
        }
      }
      
      this.setData({
        formData: {
          nickname: userInfo.nickname || '',
          avatarUrl: avatarUrl,
          phone: userInfo.phone || ''
        }
      });
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      });
    });
  },

  onNicknameInput: function(e) {
    this.setData({
      'formData.nickname': e.detail.value || e.detail
    });
  },

  onPhoneInput: function(e) {
    this.setData({
      'formData.phone': e.detail.value || e.detail
    });
  },

  onAvatarUpload: function() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0];
        
        // 保存临时路径用于显示
        that.setData({
          tempAvatarPath: tempFilePath
        });
        
        wx.showToast({
          title: '头像已选择',
          icon: 'success'
        });
      },
      fail: function(err) {
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        });
      }
    });
  },

  onSave: function() {
    const { nickname, phone } = this.data.formData;
    const tempAvatarPath = this.data.tempAvatarPath;
    
    if (!nickname || !nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式（如果填写了手机号）
    if (phone && phone.trim()) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone.trim())) {
        wx.showToast({
          title: '手机号格式不正确',
          icon: 'none'
        });
        return;
      }
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    // 如果有新选择的头像，先上传头像
    if (tempAvatarPath) {
      this.uploadAvatar(tempAvatarPath).then(avatarUrl => {
        // 构建完整的头像 URL
        const serverBaseUrl = 'http://10.167.79.202:3001';
        const fullAvatarUrl = serverBaseUrl + avatarUrl + '?t=' + Date.now();
        
        // 上传成功后更新用户信息
        return this.updateUserProfile({
          nickname: nickname.trim(),
          avatarUrl: avatarUrl, // 服务器需要相对路径
          phone: phone ? phone.trim() : ''
        }).then(() => {
          // 更新本地头像路径，使用完整的 URL
          this.setData({
            'formData.avatarUrl': fullAvatarUrl,
            tempAvatarPath: ''
          });
        });
      }).then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      }).catch(error => {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        });
      });
    } else {
      // 没有新头像，直接更新用户信息
      this.updateUserProfile({
        nickname: nickname.trim(),
        phone: phone ? phone.trim() : ''
      }).then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      }).catch(error => {
        console.error('保存失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        });
      });
    }
  },

  // 上传头像
  uploadAvatar: function(filePath) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      if (!token) {
        reject(new Error('未登录'));
        return;
      }

      // 使用API_BASE_URL
      const API_BASE_URL = 'http://10.167.79.202:3001/api';

      wx.uploadFile({
        url: `${API_BASE_URL}/auth/upload-avatar`,
        filePath: filePath,
        name: 'avatar',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 0) {
              resolve(data.data.avatarUrl);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (error) {
            reject(new Error('解析响应失败'));
          }
        },
        fail: (error) => {
          reject(new Error('上传头像失败'));
        }
      });
    });
  },

  // 更新用户信息
  updateUserProfile: function(userInfo) {
    return DataManager.updateProfile(userInfo);
  }
});
