Component({
  data: {
    selected: 0,
    color: "#999",
    selectedColor: "#27AE60",
    isSeniorMode: false,
    seniorTheme: 'white',
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/images/tab/tab_home_normal.png",
        selectedIconPath: "/images/tab/tab_home_active.png"
      },
      {
        pagePath: "/pages/plan/plan",
        text: "计划",
        iconPath: "/images/tab/tab_plan_normal.png",
        selectedIconPath: "/images/tab/tab_plan_active.png"
      },
      {
        pagePath: "/pages/medicine/medicine",
        text: "药品库",
        iconPath: "/images/tab/tab_med_normal.png",
        selectedIconPath: "/images/tab/tab_med_active.png"
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        iconPath: "/images/tab/tab_mine_normal.png",
        selectedIconPath: "/images/tab/tab_mine_active.png"
      }
    ],
    seniorList: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/images/tab/tab_home_normal.png",
        selectedIconPath: "/images/tab/tab_home_active.png"
      },
      {
        pagePath: "/pages/mine/mine",
        text: "我的",
        iconPath: "/images/tab/tab_mine_normal.png",
        selectedIconPath: "/images/tab/tab_mine_active.png"
      }
    ]
  },

  attached() {
    this.updateTabBar();
  },

  pageLifetimes: {
    show() {
      this.updateTabBar();
    }
  },

  methods: {
    updateTabBar() {
      const isSeniorMode = wx.getStorageSync('seniorMode') || false;
      const seniorTheme = wx.getStorageSync('seniorTheme') || 'white';
      
      // 获取当前页面路径
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage ? currentPage.route : '';
      
      // 根据当前路径设置选中状态
      let selected = 0;
      if (isSeniorMode) {
        // 老年模式只有两个tab
        if (route.includes('pages/mine/mine')) {
          selected = 1;
        } else {
          selected = 0;
        }
      } else {
        // 普通模式有四个tab
        if (route.includes('pages/index/index')) {
          selected = 0;
        } else if (route.includes('pages/plan/plan')) {
          selected = 1;
        } else if (route.includes('pages/medicine/medicine')) {
          selected = 2;
        } else if (route.includes('pages/mine/mine')) {
          selected = 3;
        }
      }
      
      this.setData({
        isSeniorMode: isSeniorMode,
        seniorTheme: seniorTheme,
        selected: selected
      });
    },

    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      const index = data.index;
      
      this.setData({
        selected: index
      });
      
      wx.switchTab({ url });
    }
  }
});

