const DataManager = require('../../utils/dataManager');

Page({
  data: {
    loading: false,
    scanResult: null,
    medicineInfo: null
  },

  onLoad: function(options) {
    this.autoScan();
  },

  autoScan: function() {
    this.onScanCode();
  },

  onScanCode: function() {
    wx.scanCode({
      success: (res) => {
        this.setData({ scanResult: res });
        this.processScanResult(res);
      },
      fail: (err) => {
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  processScanResult: function(res) {
    this.setData({ loading: true });
    
    // 模拟扫码后获取药品信息
    setTimeout(() => {
      const medicineInfo = this.matchMedicineByBarcode(res.result);
      this.setData({ 
        medicineInfo: medicineInfo,
        loading: false 
      });
      
      if (medicineInfo) {
        wx.showToast({
          title: '扫码成功，已识别药品',
          icon: 'success'
        });
        this.navigateToAddMedicine(medicineInfo);
      } else {
        wx.showToast({
          title: '未识别到药品信息',
          icon: 'none'
        });
      }
    }, 1000);
  },

  matchMedicineByBarcode: function(barcode) {
    // 模拟根据条形码匹配药品信息
    const mockMedicines = {
      '6901021111111': {
        name: '阿莫西林胶囊',
        manufacturer: '哈药集团',
        specification: '0.25g×24粒',
        category: '抗生素',
        dosage: '口服，一次1粒，一日3次',
        daysToExpiry: 365
      },
      '6901021111112': {
        name: '布洛芬缓释胶囊',
        manufacturer: '芬必得',
        specification: '0.3g×24粒',
        category: '解热镇痛',
        dosage: '口服，一次1粒，一日2次',
        daysToExpiry: 365
      },
      '6901021111113': {
        name: '感冒灵颗粒',
        manufacturer: '999感冒灵',
        specification: '9g×10袋',
        category: '感冒用药',
        dosage: '开水冲服，一次1袋，一日3次',
        daysToExpiry: 730
      }
    };
    
    return mockMedicines[barcode] || null;
  },

  navigateToAddMedicine: function(medicineInfo) {
    wx.navigateTo({
      url: `/pages/medicine/medicine?scan=true&name=${encodeURIComponent(medicineInfo.name)}&manufacturer=${encodeURIComponent(medicineInfo.manufacturer)}&specification=${encodeURIComponent(medicineInfo.specification)}&category=${encodeURIComponent(medicineInfo.category)}&dosage=${encodeURIComponent(medicineInfo.dosage)}&daysToExpiry=${medicineInfo.daysToExpiry}`
    });
  },

  onRetry: function() {
    this.onScanCode();
  },

  onManualAdd: function() {
    wx.navigateTo({
      url: '/pages/medicine/medicine'
    });
  }
});