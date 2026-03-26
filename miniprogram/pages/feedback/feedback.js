Page({
  data: {
    formData: {
      type: 'suggestion',
      content: '',
      contact: ''
    },
    
    types: [
      { label: '功能建议', value: 'suggestion' },
      { label: '问题反馈', value: 'bug' },
      { label: '其他', value: 'other' }
    ]
  },

  onLoad: function(options) {
    
  },

  onTypeChange: function(e) {
    this.setData({
      'formData.type': e.detail
    });
  },

  onContentInput: function(e) {
    this.setData({
      'formData.content': e.detail
    });
  },

  onContactInput: function(e) {
    this.setData({
      'formData.contact': e.detail
    });
  },

  onSubmit: function() {
    const { type, content, contact } = this.data.formData;
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...',
      mask: true
    });

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1000);
  }
});