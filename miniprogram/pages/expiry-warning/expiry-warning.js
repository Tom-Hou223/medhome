const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    loading: false,
    statusBarHeight: 0,
    
    filterType: 'all',
    
    warningList: [],
    expiredList: [],
    
    showDetailDialog: false,
    selectedMedicine: null
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadWarningData();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.initSeniorMode();
    this.loadWarningData();
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
    this.setData({
      isSeniorMode: isSeniorMode
    });
  },

  loadWarningData: function() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    DataManager.getMedicines().then(res => {
      const medicines = res.data;
      const today = new Date();
      
      const warningList = [];
      const expiredList = [];
      
      medicines.forEach(medicine => {
        const expiryDate = new Date(medicine.createdAt);
        expiryDate.setDate(expiryDate.getDate() + (medicine.daysToExpiry || 365));
        
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        const medicineWithDays = {
          ...medicine,
          expiryDate: expiryDate.toISOString().split('T')[0],
          daysToExpiry: daysToExpiry
        };
        
        if (daysToExpiry <= 0) {
          expiredList.push(medicineWithDays);
        } else if (daysToExpiry <= 30) {
          warningList.push(medicineWithDays);
        }
      });
      
      warningList.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
      expiredList.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
      
      this.setData({
        warningList,
        expiredList,
        loading: false
      });
    }).catch(error => {
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  onFilterChange: function(e) {
    this.setData({
      filterType: e.detail
    });
  },

  onMedicineClick: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    this.setData({
      selectedMedicine: medicine,
      showDetailDialog: true
    });
  },

  onEditMedicine: function() {
    if (!this.data.selectedMedicine) return;
    
    wx.navigateTo({
      url: `/pages/medicine-detail/medicine-detail?id=${this.data.selectedMedicine.id}`
    });
    
    this.onCloseDetailDialog();
  },

  onDeleteMedicine: function() {
    if (!this.data.selectedMedicine) return;
    
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能删除药品',
        showCancel: true,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${this.data.selectedMedicine.name}"吗？`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await DataManager.deleteMedicine(this.data.selectedMedicine.id);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.onCloseDetailDialog();
            this.loadWarningData();
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onCloseDetailDialog: function() {
    this.setData({
      showDetailDialog: false,
      selectedMedicine: null
    });
  },

  onRefresh: function() {
    this.loadWarningData();
  },

  onPullDownRefresh: function() {
    this.loadWarningData();
    wx.stopPullDownRefresh();
  }
});