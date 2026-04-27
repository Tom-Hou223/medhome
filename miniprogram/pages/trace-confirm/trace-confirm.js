const DataManager = require('../../utils/dataManager');

Page({
  data: {
    traceCode: '',
    imagePaths: [],
    statusBarHeight: 0
  },

  onLoad: function(options) {
    const systemInfo = wx.getSystemInfoSync();
    
    // 从全局数据获取图片路径
    let imagePaths = [];
    if (getApp().globalData.traceCodeImage) {
      imagePaths = [getApp().globalData.traceCodeImage];
      // 清空全局数据
      getApp().globalData.traceCodeImage = null;
    }
    
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      traceCode: options.traceCode || '',
      imagePaths: imagePaths
    });
  },

  // 绑定溯源码输入
  bindTraceCodeInput: function(e) {
    this.setData({
      traceCode: e.detail.value
    });
  },

  // 重新扫码
  onRescan: function() {
    wx.showActionSheet({
      itemList: ['拍照溯源', '打开相册'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照溯源
          this.takeTracePhoto('camera');
        } else if (res.tapIndex === 1) {
          // 打开相册
          this.takeTracePhoto('album');
        }
      }
    });
  },

  // 选择溯源图片
  takeTracePhoto: function(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: [sourceType],
      success: (res) => {
        const imagePath = res.tempFilePaths[0];
        this.recognizeTraceCode(imagePath);
      },
      fail: (error) => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  // 识别药品溯源码
  recognizeTraceCode: function(imagePath) {
    wx.showLoading({ title: '识别中...' });
    
    // 调用后端 API 识别溯源码
    DataManager.recognizeImage(imagePath).then(res => {
      wx.hideLoading();
      
      if (res.code === 0 && res.data && res.data.traceCode) {
        // 识别成功，更新数据
        this.setData({
          traceCode: res.data.traceCode,
          imagePaths: [imagePath]
        });
      } else {
        // 识别失败，提示并提供重新拍摄选项
        wx.showModal({
          title: '提示',
          content: '未识别到有效溯源码，请重新拍摄',
          confirmText: '重新拍摄',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.onRescan();
            }
          }
        });
      }
    }).catch(error => {
      wx.hideLoading();
      // 识别失败，提示并提供重新拍摄选项
      wx.showModal({
        title: '提示',
        content: '识别失败，请重新拍摄',
        confirmText: '重新拍摄',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.onRescan();
          }
        }
      });
    });
  },

  // 添加照片
  onAddImage: function() {
    if (this.data.imagePaths.length >= 9) {
      wx.showToast({ title: '最多添加9张照片', icon: 'none' });
      return;
    }
    
    wx.chooseImage({
      count: 9 - this.data.imagePaths.length,
      sizeType: ['original', 'compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        this.setData({
          imagePaths: [...this.data.imagePaths, ...res.tempFilePaths]
        });
      },
      fail: (error) => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  // 删除照片
  onDeleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const imagePaths = this.data.imagePaths.filter((_, i) => i !== index);
    this.setData({ imagePaths });
  },

  // 确认并查询
  onConfirm: function() {
    if (!this.data.traceCode) {
      wx.showToast({ title: '溯源码不能为空', icon: 'none' });
      return;
    }
    
    // 复制溯源码
    wx.setClipboardData({
      data: this.data.traceCode,
      success: () => {
        wx.showToast({ title: '复制成功', icon: 'success' });
        
        // 跳转到码上放心平台
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/webview/webview?url=https://www.mashangfangxin.com/'
          });
        }, 1000);
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' });
      }
    });
  }
});
