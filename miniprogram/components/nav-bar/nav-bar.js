Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: true
    },
    showHome: {
      type: Boolean,
      value: false
    },
    backgroundColor: {
      type: String,
      value: '#ffffff'
    },
    titleColor: {
      type: String,
      value: '#333333'
    },
    rightButtons: {
      type: Array,
      value: []
    }
  },

  data: {
    statusBarHeight: 0
  },

  lifetimes: {
    attached() {
      this.getSystemInfo();
    }
  },

  methods: {
    getSystemInfo() {
      wx.getSystemInfo({
        success: (res) => {
          this.setData({
            statusBarHeight: res.statusBarHeight
          });
        }
      });
    },

    onBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({
          delta: 1
        });
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    },

    onHome() {
      this.triggerEvent('home');
    },

    onRightButtonClick(e) {
      const button = e.currentTarget.dataset.button;
      this.triggerEvent('rightbuttonclick', { button });
    }
  }
});