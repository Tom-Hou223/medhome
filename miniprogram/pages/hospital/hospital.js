const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    loading: false,
    nearByHospitals: [],
    currentLocation: null,
    recycleGuidelines: [
      {
        title: '过期药品危害',
        content: '过期药品不仅失去药效，还可能产生有害物质，对人体健康和环境造成严重危害。'
      },
      {
        title: '正确回收方法',
        content: '将过期药品送至指定回收点，不要随意丢弃或冲入下水道。'
      },
      {
        title: '回收注意事项',
        content: '保持药品包装完整，分类存放，避免儿童接触。'
      },
      {
        title: '回收时间',
        content: '一般医院和药店都会设有固定的回收点，可在工作日前往。'
      }
    ]
  },

  onLoad: function(options) {
    this.checkLoginStatus();
    this.initSeniorMode();
    this.getLocation();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.initSeniorMode();
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode
    });
  },

  initSeniorMode: function() {
    const isSeniorMode = wx.getStorageSync('seniorMode') || false;
    this.setData({ isSeniorMode: isSeniorMode });
  },

  getLocation: function() {
    this.setData({ loading: true });
    
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        this.setData({ currentLocation: res });
        this.searchNearByHospitals(res.latitude, res.longitude);
      },
      fail: (err) => {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  searchNearByHospitals: function(latitude, longitude) {
    // 模拟附近回收点数据
    const mockHospitals = [
      {
        id: 1,
        name: '社区卫生服务中心',
        address: '北京市海淀区中关村南大街5号',
        distance: '500m',
        phone: '010-12345678',
        type: '医院',
        latitude: latitude,
        longitude: longitude + 0.001
      },
      {
        id: 2,
        name: '同仁堂药店',
        address: '北京市海淀区中关村大街1号',
        distance: '800m',
        phone: '010-87654321',
        type: '药店',
        latitude: latitude + 0.001,
        longitude: longitude
      },
      {
        id: 3,
        name: '协和医院',
        address: '北京市东城区帅府园1号',
        distance: '2.5km',
        phone: '010-69156114',
        type: '医院',
        latitude: latitude + 0.01,
        longitude: longitude + 0.01
      }
    ];

    setTimeout(() => {
      this.setData({
        nearByHospitals: mockHospitals,
        loading: false
      });
    }, 1000);
  },

  onHospitalClick: function(e) {
    const hospital = e.currentTarget.dataset.hospital;
    this.openLocation(hospital);
  },

  openLocation: function(hospital) {
    wx.openLocation({
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      name: hospital.name,
      address: hospital.address,
      scale: 18
    });
  },

  onCallPhone: function(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({
      phoneNumber: phone
    });
  },

  onRefresh: function() {
    this.getLocation();
  },

  onPullDownRefresh: function() {
    this.getLocation();
    wx.stopPullDownRefresh();
  }
});