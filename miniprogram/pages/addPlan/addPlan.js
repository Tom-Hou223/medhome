Page({
  data: {
    statusBarHeight: 0
  },

  onLoad: function(options) {
    this.getSystemInfo();
  },

  getSystemInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          statusBarHeight: res.statusBarHeight
        });
      }
    });
  }
});