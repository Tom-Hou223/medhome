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
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        console.log('扫码结果:', res);
        this.setData({ scanResult: res });
        this.processScanResult(res);
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  processScanResult: function(res) {
    this.setData({ loading: true });
    
    // 调用真实的API进行条形码识别
    DataManager.recognizeBarcode(res.result).then(response => {
      this.setData({ loading: false });
      
      if (response.code === 0 && response.data) {
        this.setData({ medicineInfo: response.data });
        wx.showToast({
          title: '扫码成功，已识别药品',
          icon: 'success'
        });
        this.navigateToAddMedicine(response.data, res.result);
      } else {
        this.showRecognitionFailed(res.result);
      }
    }).catch(error => {
      console.error('条形码识别失败:', error);
      this.setData({ loading: false });
      this.showRecognitionFailed(res.result);
    });
  },

  showRecognitionFailed: function(barcode) {
    wx.showModal({
      title: '提示',
      content: '识别库中暂无该药品，请手动输入',
      confirmText: '手动输入',
      cancelText: '重新扫描',
      success: (modalRes) => {
        if (modalRes.confirm) {
          // 打开表单，只填充条形码
          this.navigateToAddMedicine({ barcode: barcode }, barcode);
        } else {
          this.onScanCode();
        }
      }
    });
  },

  navigateToAddMedicine: function(medicineInfo, barcode = '') {
    wx.navigateTo({
      url: `/pages/medicine/medicine?scan=true&name=${encodeURIComponent(medicineInfo.name || '')}&manufacturer=${encodeURIComponent(medicineInfo.manufacturer || '')}&specification=${encodeURIComponent(medicineInfo.specification || '')}&category=${encodeURIComponent(medicineInfo.category || '其他')}&dosage=${encodeURIComponent(medicineInfo.dosage || '')}&barcode=${encodeURIComponent(barcode)}`
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