const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    activeTab: 'medicine',
    loading: false,
    statusBarHeight: 0,
    
    // 药品统计数据
    medicineStats: {
      total: 0,
      normal: 0,
      expiring: 0,
      expired: 0
    },
    
    // 用药计划统计数据
    planStats: {
      total: 0,
      active: 0,
      ended: 0
    },
    
    // 提醒记录统计数据
    reminderStats: {
      today: 0,
      completed: 0,
      missed: 0,
      total: 0
    }
  },

  onLoad: function() {
    this.getSystemInfo();
    this.loadData();
  },

  onShow: function() {
    this.loadData();
  },

  onPullDownRefresh: function() {
    this.loadData();
    wx.stopPullDownRefresh();
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

  onTabChange: function(e) {
    this.setData({
      activeTab: e.detail.name
    });
  },

  loadData: function() {
    this.setData({ loading: true });

    Promise.all([
      this.loadMedicineStats(),
      this.loadPlanStats(),
      this.loadReminderStats()
    ]).then(() => {
      this.setData({ loading: false });
    }).catch(error => {
      console.error('加载统计数据失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  loadMedicineStats: function() {
    return DataManager.getMedicineStatistics().then(res => {
      if (res.code === 0) {
        const data = res.data;
        this.setData({
          'medicineStats.total': data.total,
          'medicineStats.normal': data.normal,
          'medicineStats.expiring': data.warning,
          'medicineStats.expired': data.expired
        });
        this.drawExpiryChart(data.expiryTrend);
      }
    }).catch(error => {
      console.error('加载药品统计失败:', error);
      // 不显示错误提示，使用默认数据
    });
  },

  loadPlanStats: function() {
    return DataManager.getPlanStatistics().then(res => {
      if (res.code === 0) {
        const data = res.data;
        this.setData({
          'planStats.total': data.total,
          'planStats.active': data.active,
          'planStats.ended': data.completed
        });
        this.drawPlanChart(data.planTrend);
      }
    }).catch(error => {
      console.error('加载计划统计失败:', error);
      // 不显示错误提示，使用默认数据
    });
  },

  loadReminderStats: function() {
    return DataManager.getReminderStatistics().then(res => {
      if (res.code === 0) {
        const data = res.data;
        this.setData({
          'reminderStats.today': data.todayTotal,
          'reminderStats.completed': data.completed,
          'reminderStats.missed': data.missed,
          'reminderStats.total': data.totalReminders
        });
      }
    }).catch(error => {
      console.error('加载提醒统计失败:', error);
      // 不显示错误提示，使用默认数据
    });
  },

  drawExpiryChart: function(trendData) {
    const ctx = wx.createCanvasContext('expiryChart');
    if (!ctx) return;

    // 绘制过期趋势图表
    // 这里可以使用更复杂的图表库，现在使用简单的 Canvas 绘制
    ctx.clearRect(0, 0, 300, 200);
    
    // 绘制坐标轴
    ctx.setStrokeStyle('#ddd');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(50, 10);
    ctx.lineTo(50, 190);
    ctx.lineTo(290, 190);
    ctx.stroke();

    // 绘制数据点
    if (trendData && trendData.length > 0) {
      const maxCount = Math.max(...trendData.map(item => item.count));
      const stepX = (290 - 50) / (trendData.length - 1);
      const stepY = 180 / (maxCount || 1);

      ctx.setStrokeStyle('#27AE60');
      ctx.setLineWidth(2);
      ctx.beginPath();
      
      trendData.forEach((item, index) => {
        const x = 50 + index * stepX;
        const y = 190 - item.count * stepY;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // 绘制数据点
        ctx.setFillStyle('#27AE60');
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      ctx.stroke();
    }

    ctx.draw();
  },

  drawPlanChart: function(trendData) {
    const ctx = wx.createCanvasContext('planChart');
    if (!ctx) return;

    // 绘制计划趋势图表
    ctx.clearRect(0, 0, 300, 200);
    
    // 绘制坐标轴
    ctx.setStrokeStyle('#ddd');
    ctx.setLineWidth(1);
    ctx.beginPath();
    ctx.moveTo(50, 10);
    ctx.lineTo(50, 190);
    ctx.lineTo(290, 190);
    ctx.stroke();

    // 绘制数据点
    if (trendData && trendData.length > 0) {
      const maxCount = Math.max(...trendData.map(item => item.count));
      const stepX = (290 - 50) / (trendData.length - 1);
      const stepY = 180 / (maxCount || 1);

      ctx.setStrokeStyle('#3498DB');
      ctx.setLineWidth(2);
      ctx.beginPath();
      
      trendData.forEach((item, index) => {
        const x = 50 + index * stepX;
        const y = 190 - item.count * stepY;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // 绘制数据点
        ctx.setFillStyle('#3498DB');
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      ctx.stroke();
    }

    ctx.draw();
  },

  onRefresh: function() {
    this.loadData();
  }
});
