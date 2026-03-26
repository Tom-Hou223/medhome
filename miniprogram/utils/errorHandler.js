const errorHandler = {
  handleError: function(error, context = '') {
    let message = '操作失败';
    
    if (error.errMsg) {
      if (error.errMsg.includes('chooseImage:fail')) {
        message = '选择图片失败';
      } else if (error.errMsg.includes('uploadFile:fail')) {
        message = '上传图片失败';
      } else if (error.errMsg.includes('request:fail')) {
        message = '网络请求失败';
      } else if (error.errMsg.includes('auth deny')) {
        message = '权限被拒绝';
      }
    }
    
    return message;
  },

  showToast: function(error, context = '') {
    const message = this.handleError(error, context);
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  showErrorModal: function(title, content, callback) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: false,
      confirmText: '确定',
      success: callback
    });
  }
};

module.exports = errorHandler;