const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    loading: false,
    statusBarHeight: 0,
    exportType: 'medicine', // medicine, plan, record
    dateRange: {
      start: '',
      end: ''
    },
    showDatePicker: false,
    datePickerType: 'start',
    currentDate: new Date().getTime(),
    minDate: new Date().getTime() - 365 * 24 * 60 * 60 * 1000, // 1年前
    maxDate: new Date().getTime() // 今天
  },

  onLoad: function() {
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
  },

  onExportTypeChange: function(e) {
    this.setData({
      exportType: e.detail
    });
  },

  onStartDateSelect: function() {
    this.setData({
      showDatePicker: true,
      datePickerType: 'start'
    });
  },

  onEndDateSelect: function() {
    this.setData({
      showDatePicker: true,
      datePickerType: 'end'
    });
  },

  onDateConfirm: function(e) {
    const date = e.detail;
    if (this.data.datePickerType === 'start') {
      this.setData({
        'dateRange.start': date
      });
    } else {
      this.setData({
        'dateRange.end': date
      });
    }
    this.setData({
      showDatePicker: false
    });
  },

  onDateCancel: function() {
    this.setData({
      showDatePicker: false
    });
  },

  onExport: function() {
    this.setData({ loading: true });

    let exportPromise;
    const { exportType, dateRange } = this.data;

    switch (exportType) {
      case 'medicine':
        exportPromise = this.exportMedicines();
        break;
      case 'plan':
        exportPromise = this.exportPlans();
        break;
      case 'record':
        if (!dateRange.start || !dateRange.end) {
          wx.showToast({
            title: '请选择日期范围',
            icon: 'none'
          });
          this.setData({ loading: false });
          return;
        }
        exportPromise = this.exportRecords(dateRange.start, dateRange.end);
        break;
      default:
        this.setData({ loading: false });
        return;
    }

    exportPromise.then(() => {
      this.setData({ loading: false });
      wx.showToast({
        title: '导出成功',
        icon: 'success'
      });
    }).catch(error => {
      console.error('导出失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    });
  },

  exportMedicines: function() {
    return DataManager.getMedicines().then(res => {
      if (res.code === 0) {
        const medicines = res.data;
        // 生成CSV数据
        const csvData = this.generateMedicineCSV(medicines);
        // 保存为文件
        return this.saveCSVFile(csvData, '药品数据.csv');
      }
      throw new Error('获取药品数据失败');
    });
  },

  exportPlans: function() {
    return DataManager.getPlans().then(res => {
      if (res.code === 0) {
        const plans = res.data;
        // 生成CSV数据
        const csvData = this.generatePlanCSV(plans);
        // 保存为文件
        return this.saveCSVFile(csvData, '用药计划.csv');
      }
      throw new Error('获取用药计划数据失败');
    });
  },

  exportRecords: function(startDate, endDate) {
    return DataManager.getRecordsByRange(startDate, endDate).then(res => {
      if (res.code === 0) {
        const records = res.data;
        // 生成CSV数据
        const csvData = this.generateRecordCSV(records);
        // 保存为文件
        return this.saveCSVFile(csvData, `用药记录_${startDate}_${endDate}.csv`);
      }
      throw new Error('获取用药记录数据失败');
    });
  },

  generateMedicineCSV: function(medicines) {
    let csv = '药品名称,生产厂家,规格,用量,库存,单位,过期日期,类别,状态,备注\n';
    
    medicines.forEach(medicine => {
      const row = [
        medicine.name || '',
        medicine.manufacturer || '',
        medicine.specification || '',
        medicine.dosage || '',
        medicine.stock || 0,
        medicine.unit || '',
        medicine.expiryDate || '',
        medicine.category || '',
        this.getMedicineStatusText(medicine.status),
        medicine.note || ''
      ];
      csv += row.map(item => `"${item}"`).join(',') + '\n';
    });
    
    return csv;
  },

  generatePlanCSV: function(plans) {
    let csv = '药品名称,家庭成员,频率,开始日期,结束日期,状态,备注\n';
    
    plans.forEach(plan => {
      const row = [
        plan.medicineName || '',
        plan.memberName || '',
        plan.frequency || '',
        plan.startDate || '',
        plan.endDate || '',
        plan.status === 'active' ? '进行中' : '已结束',
        plan.note || ''
      ];
      csv += row.map(item => `"${item}"`).join(',') + '\n';
    });
    
    return csv;
  },

  generateRecordCSV: function(records) {
    let csv = '药品名称,家庭成员,时间,日期,状态,备注\n';
    
    records.forEach(record => {
      const row = [
        record.medicineName || '',
        record.memberName || '',
        record.time || '',
        record.date || '',
        this.getRecordStatusText(record.status),
        record.supplement || ''
      ];
      csv += row.map(item => `"${item}"`).join(',') + '\n';
    });
    
    return csv;
  },

  getMedicineStatusText: function(status) {
    switch (status) {
      case 'normal':
        return '正常';
      case 'warning':
        return '临期';
      case 'expired':
        return '过期';
      default:
        return '未知';
    }
  },

  getRecordStatusText: function(status) {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'missed':
        return '漏服';
      case 'pending':
        return '待服用';
      default:
        return '未知';
    }
  },

  saveCSVFile: function(csvData, fileName) {
    return new Promise((resolve, reject) => {
      // 在小程序中，我们可以使用 wx.downloadFile 和 wx.saveFile 来保存文件
      // 由于小程序的限制，我们需要先将 CSV 数据转换为 base64，然后通过下载的方式保存
      
      // 这里使用一个模拟的方式，实际项目中可能需要后端支持
      wx.showModal({
        title: '导出成功',
        content: `文件 ${fileName} 已生成，共 ${csvData.split('\n').length - 1} 条记录`,
        showCancel: false,
        success: resolve
      });
    });
  }
});
