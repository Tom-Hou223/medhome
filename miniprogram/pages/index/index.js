/**
 * 首页页面逻辑
 * 负责处理日历展示、用药计划、药品统计等功能
 */
const DataManager = require('../../utils/dataManager.js');
const util = require('../../utils/util.js');

/**
 * 日期工具函数
 * 用于统一处理日期相关操作，确保类型一致性
 */
const dateUtils = {
  /**
   * 获取当前日期的字符串表示（YYYY-MM-DD）
   * @returns {string} 当前日期字符串
   */
  getCurrentDateString: function() {
    const today = new Date();
    return util.formatDate(today);
  },
  
  /**
   * 获取指定年月的第一天
   * @param {number} year - 年份
   * @param {number} month - 月份（1-12）
   * @returns {Date} 第一天的Date对象
   */
  getMonthFirstDate: function(year, month) {
    return new Date(year, month - 1, 1);
  },
  
  /**
   * 获取指定年月的最后一天
   * @param {number} year - 年份
   * @param {number} month - 月份（1-12）
   * @returns {Date} 最后一天的Date对象
   */
  getMonthLastDate: function(year, month) {
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, lastDay);
  },
  
  /**
   * 获取年月选择器的日期范围
   * @param {number} currentYear - 当前年份
   * @returns {Object} 包含最小和最大日期的对象
   */
  getPickerDateRange: function(currentYear) {
    const pickerMinYear = currentYear - 5;
    const pickerMaxYear = currentYear + 5;
    return {
      min: new Date(pickerMinYear, 0, 1).getTime(),
      max: new Date(pickerMaxYear, 11, 31).getTime()
    };
  }
};

Page({
  /**
   * 页面数据
   * @property {boolean} isLoggedIn - 是否已登录
   * @property {boolean} isGuestMode - 是否为访客模式
   * @property {boolean} isSeniorMode - 是否为长辈模式
   * @property {boolean} loading - 是否正在加载
   * @property {number} statusBarHeight - 状态栏高度
   * @property {string} selectedDate - 当前选中的日期（YYYY-MM-DD）
   * @property {number} currentYear - 当前显示的年份
   * @property {number} currentMonth - 当前显示的月份
   * @property {Date} calendarBaseDate - 日历基准日期
   * @property {number} minDate - 日历最小日期（时间戳）
   * @property {number} maxDate - 日历最大日期（时间戳）
   * @property {number} pickerMinDate - 年月选择器最小日期（时间戳）
   * @property {number} pickerMaxDate - 年月选择器最大日期（时间戳）
   * @property {Object} dayStatusMap - 日期状态映射表
   * @property {boolean} showYearMonthPicker - 是否显示年月选择器
   * @property {Array} todayPlans - 当天用药计划
   * @property {Array} todayRecords - 当天用药记录
   * @property {Object} medicineStats - 药品统计数据
   */
  data: {
    // 用户状态
    isLoggedIn: false,
    isGuestMode: true,
    isSeniorMode: false,
    seniorTheme: 'white',

    // 界面状态
    loading: false,
    statusBarHeight: 0,

    // 家庭信息
    familyName: '',
    isAdmin: false,

    // 日期相关
    selectedDate: '',
    dayStatusMap: {},

    // 数据相关
    todayPlans: [],
    todayRecords: [],
    timeGroupedPlans: [],
    totalMedicinesCount: 0,

    // 统计数据
    medicineStats: {
      total: 0,
      expiring: 0,
      expired: 0
    }
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.initSeniorMode();
    this.initDate();
    this.loadData();
    this.updateTabBar();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.initSeniorMode();
    this.updateTabBar();
    
    // 重新初始化日期，确保加载当前月份的状态
    const today = new Date();
    const year = today.getFullYear();
    const monthNumber = today.getMonth() + 1;
    
    // 清空旧的日历状态，避免显示其他家庭的数据
    this.setData({
      dayStatusMap: {},
      todayPlans: [],
      timeGroupedPlans: [],
      totalMedicinesCount: 0,
      todayRecords: []
    });
    
    // 重新加载月度状态和当天数据
    this.loadMonthStatus(year, monthNumber);
    this.loadData();
  },

  /**
   * 标准化日期字符串为 YYYY-MM-DD 格式
   * 处理可能的 ISO 格式或其他格式
   * @param {string} dateStr - 原始日期字符串
   * @returns {string} 标准化后的日期字符串
   */
  normalizeDateString: function(dateStr) {
    if (!dateStr) return '';
    
    // 如果包含时间戳（ISO格式），需要转换为本地时间
    if (dateStr.indexOf('T') !== -1) {
      // 将 ISO 格式转换为 Date 对象，会自动转换为本地时区
      const date = new Date(dateStr);
      // 使用 util.formatDate 格式化为 YYYY-MM-DD
      return util.formatDate(date);
    }
    
    // 如果已经是 YYYY-MM-DD 格式（10个字符），直接返回
    if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // 其他格式尝试解析
    try {
      const date = new Date(dateStr);
      return util.formatDate(date);
    } catch (e) {
      return dateStr;
    }
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    const familyInfo = DataManager.getCurrentFamily();
    const isAdmin = DataManager.isAdmin();

    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode,
      familyName: familyInfo ? familyInfo.name : '',
      isAdmin: isAdmin
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
    const seniorTheme = wx.getStorageSync('seniorTheme') || 'white';
    this.setData({
      isSeniorMode: isSeniorMode,
      seniorTheme: seniorTheme
    });
  },

  updateTabBar: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
      this.getTabBar().updateTabBar();
    }
  },

  /**
   * 初始化日期相关数据
   */
  initDate: function() {
    const today = new Date();
    const selectedDate = util.formatDate(today);

    this.setData({
      selectedDate: selectedDate
    });

    const year = today.getFullYear();
    const monthNumber = today.getMonth() + 1;
    this.loadMonthStatus(year, monthNumber);
  },

  /**
   * 加载页面数据
   * 包括用药计划、药品统计、用药记录等
   * @param {string} dateStr - 目标日期字符串（YYYY-MM-DD）
   * @returns {Promise} 返回Promise以支持链式调用
   */
  loadData: function(dateStr) {
    if (this.data.loading) return Promise.resolve();
    
    this.setData({ loading: true });

    const targetDate = dateStr || this.data.selectedDate;

    return Promise.all([
      DataManager.getPlans(),
      DataManager.getMedicines(),
      DataManager.getRecords(targetDate)
    ]).then(([plansRes, medicinesRes, recordsRes]) => {
      // 处理数据
      const plansForDate = plansRes.data.filter(plan => {
        if (plan.status !== 'active') return false;
        
        // 格式化计划的开始和结束日期，确保格式统一
        const planStartDate = plan.startDate ? this.normalizeDateString(plan.startDate) : null;
        const planEndDate = plan.endDate ? this.normalizeDateString(plan.endDate) : null;
        
        // 开始日期：如果设置了开始日期，且目标日期早于开始日期，则排除
        if (planStartDate && targetDate < planStartDate) return false;
        
        // 结束日期：如果设置了结束日期，且目标日期晚于结束日期，则排除
        // 注意：结束日期当天应该包含在内，所以用 > 而不是 >=
        if (planEndDate && targetDate > planEndDate) return false;
        
        return true;
      });
      
      // 计算药品统计数据，与药品库逻辑保持一致
      const currentDate = new Date();
      let expiring = 0;
      let expired = 0;
      
      medicinesRes.data.forEach(medicine => {
        try {
          const expiryDate = new Date(medicine.expiryDate);
          const timeDiff = expiryDate - currentDate;
          const daysToExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry <= 0) {
            // 已过期
            expired++;
          } else if (daysToExpiry <= 90) {
            // 临期（90天内）
            expiring++;
          }
        } catch (error) {
          console.error('计算药品状态失败:', error);
        }
      });
      
      const total = medicinesRes.data.length;
      
      // 处理数据，按时间分组
      const timeGroupedPlans = this.groupPlansByTime(plansForDate, recordsRes.data);

      // 计算药品总数
      const totalMedicinesCount = timeGroupedPlans.reduce((count, group) => {
        return count + group.total;
      }, 0);

      // 批量更新数据，减少setData调用次数
      this.setData({
        todayPlans: plansForDate,
        timeGroupedPlans: timeGroupedPlans,
        totalMedicinesCount: totalMedicinesCount,
        medicineStats: {
          total,
          expiring,
          expired
        },
        todayRecords: recordsRes.data,
        loading: false
      });
    }).catch(error => {
      this.setData({
        loading: false,
        todayPlans: [],
        timeGroupedPlans: [],
        totalMedicinesCount: 0,
        todayRecords: []
      });
      
      // 根据错误类型显示不同的提示
      if (error.message === '未登录') {
        // 游客模式，使用模拟数据
        this.loadMockData();
      } else if (error.message === '请先选择家庭') {
        // 已登录但未选择家庭
        wx.showToast({
          title: '请先选择家庭',
          icon: 'none'
        });
      } else {
        // 其他错误
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
      throw error;
    });
  },

  loadMonthStatus: function(year, month) {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    const today = util.formatDate(new Date());

    return Promise.all([
      DataManager.getPlans(),
      DataManager.getRecordsByRange(startDate, endDate)
    ]).then(([plansRes, recordsRes]) => {
      // 包含所有状态的计划，不仅仅是active，这样可以计算已完成计划的状态
      const activePlans = plansRes.data;
      const monthRecords = recordsRes.data || [];
      const dayStatusMap = {};

      for (let d = 1; d <= lastDay; d++) {
        const dayStr = String(d).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        // 获取该日期的所有活跃计划
        const dayPlans = activePlans.filter(plan => {
          // 格式化计划的开始和结束日期，确保格式统一
          const planStartDate = plan.startDate ? this.normalizeDateString(plan.startDate) : null;
          const planEndDate = plan.endDate ? this.normalizeDateString(plan.endDate) : null;
          
          // 将日期字符串转换为Date对象进行比较
          const currentDate = new Date(dateStr);
          
          // 开始日期：如果设置了开始日期，且当前日期早于开始日期，则排除
          if (planStartDate) {
            const startDate = new Date(planStartDate);
            if (currentDate < startDate) return false;
          }
          
          // 结束日期：如果设置了结束日期，且当前日期晚于结束日期，则排除
          // 注意：结束日期当天应该包含在内，所以用 > 而不是 >=
          if (planEndDate) {
            const endDate = new Date(planEndDate);
            if (currentDate > endDate) return false;
          }
          
          // 对于没有设置开始日期和结束日期的计划，只包含当前日期和未来日期
          if (!planStartDate && !planEndDate) {
            const todayDate = new Date(today);
            if (currentDate < todayDate) return false;
          }
          
          return true;
        });

        // 如果该日期没有计划，跳过（不设置状态）
        if (dayPlans.length === 0) {
          continue;
        }

        // 计算该日期应该有多少次服药（考虑每个计划的时间槽）
        let totalExpectedCount = 0;
        dayPlans.forEach(plan => {
          const timeSlots = plan.timeSlots || ['默认时间'];
          totalExpectedCount += timeSlots.length;
        });

        // 获取该日期的所有记录
        // 注意：记录的date字段可能是ISO格式的时间戳，需要转换
        const dayRecords = monthRecords.filter(r => {
          let recordDate = r.date;
          // 如果是ISO格式的时间戳，转换为日期字符串
          if (recordDate && recordDate.includes('T')) {
            const date = new Date(recordDate);
            recordDate = util.formatDate(date);
          }
          // 确保日期格式匹配
          return recordDate === dateStr;
        });
        
        // 统计已完成和漏服的记录数
        const completedCount = dayRecords.filter(r => r.status === 'completed').length;
        const missedCount = dayRecords.filter(r => r.status === 'missed').length;
        
        // 调试信息
        console.log(`Date: ${dateStr}, Plans: ${dayPlans.length}, Expected: ${totalExpectedCount}, Completed: ${completedCount}, Records: ${dayRecords.length}`);

        let status = 'none';

        // 判断状态的逻辑：
        // 1. 如果所有计划都已完成 -> done（绿色）
        // 2. 如果有漏服记录 -> missed（红色）
        // 3. 如果是今天或未来，且有未完成的计划 -> pending（黄色）
        // 4. 如果是过去的日期，且有未完成的计划 -> missed（红色）

        if (completedCount >= totalExpectedCount) {
          // 所有计划都已完成
          status = 'done';
        } else if (missedCount > 0) {
          // 有明确标记为漏服的记录
          status = 'missed';
        } else if (dateStr >= today) {
          // 今天或未来，还有待完成的计划
          status = 'pending';
        } else {
          // 过去的日期，还有未完成的计划，视为漏服
          status = 'missed';
        }

        dayStatusMap[dateStr] = status;
      }

      this.setData({
        dayStatusMap: Object.assign({}, dayStatusMap) // 创建新对象，触发组件更新
      });
    }).catch(error => {
      console.error('加载月度用药状态失败:', error);
      this.setData({
        dayStatusMap: {}
      });
      return Promise.reject(error);
    });
  },

  processMedicineStats: function(medicines) {
    const total = medicines.length;
    const expiring = medicines.filter(m => m.status === 'expiring').length;
    const expired = medicines.filter(m => m.status === 'expired').length;

    this.setData({
      medicineStats: {
        total,
        expiring,
        expired
      }
    });
  },



  /**
   * 日历月份变化事件处理
   * @param {Object} e - 事件对象，包含年份和月份信息
   */
  onMonthChange: function(e) {
    const { year, month } = e.detail;
    
    // 加载新月份的状态数据
    this.loadMonthStatus(year, month);
  },

  /**
   * 日历日期选择事件处理
   * @param {Object} e - 事件对象，包含选择的日期信息
   */
  onSelect: function(e) {
    // 验证事件对象
    if (!e || !e.detail) {
      return;
    }
    
    const dateStr = e.detail.value;

    if (!dateStr) {
      return;
    }

    this.setData({
      selectedDate: dateStr
    });

    this.loadData(dateStr);
  },



  /**
   * 切换到上个月
   */
  onPrevMonth: function() {
    let year = this.data.currentYear;
    let month = this.data.currentMonth - 1;

    if (month === 0) {
      month = 12;
      year -= 1;
    }

    const monthStr = String(month).padStart(2, '0');
    const selectedDate = `${year}-${monthStr}-01`;

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate
    });

    this.loadMonthStatus(year, month);
    this.loadData(selectedDate);
  },

  /**
   * 切换到下个月
   */
  onNextMonth: function() {
    let year = this.data.currentYear;
    let month = this.data.currentMonth + 1;

    if (month === 13) {
      month = 1;
      year += 1;
    }

    const monthStr = String(month).padStart(2, '0');
    const selectedDate = `${year}-${monthStr}-01`;

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate
    });

    this.loadMonthStatus(year, month);
    this.loadData(selectedDate);
  },



  onAddPlan: function() {
    wx.navigateTo({
      url: `/pages/addPlan/addPlan?date=${this.data.selectedDate}`
    });
  },

  onPlanClick: function(e) {
    const plan = e.currentTarget.dataset.plan;
    wx.navigateTo({
      url: `/pages/plan-detail/plan-detail?id=${plan.id}`
    });
  },

  onPullDownRefresh: function() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  /**
   * 回到当天
   */
  onBackToToday: function() {
    const today = new Date();
    const year = today.getFullYear();
    const monthNumber = today.getMonth() + 1;
    const selectedDateStr = util.formatDate(today);

    this.setData({
      selectedDate: selectedDateStr,
      currentDate: today.getTime(),
      currentYear: year,
      currentMonth: monthNumber
    });

    this.loadMonthStatus(year, monthNumber);
    this.loadData(selectedDateStr);
  },

  /**
   * 按时间分组用药计划
   * @param {Array} plans - 用药计划列表
   * @param {Array} records - 用药记录列表
   * @returns {Array} 按时间分组的用药计划
   */
  groupPlansByTime: function(plans, records) {
    // 时间分组映射
    const timeGroups = {};
    
    // 构建记录映射：key 为 "planId_timeSlot"
    const recordMap = {};
    records.forEach(record => {
      const key = `${record.planId}_${record.time}`;
      recordMap[key] = record;
    });

    // 处理每个计划
    plans.forEach(plan => {
      // 获取时间槽
      const timeSlots = plan.timeSlots || ['默认时间'];
      
      timeSlots.forEach(timeSlot => {
        // 生成时间键
        const timeKey = timeSlot;
        
        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = {
            time: timeKey,
            medicines: [],
            total: 0,
            completed: 0
          };
        }

        // 查找对应的记录
        const recordKey = `${plan.id}_${timeSlot}`;
        const record = recordMap[recordKey];
        
        // 确定状态
        let status = 'pending';
        let supplement = '';
        
        if (record) {
          status = record.status; // 'completed', 'missed', 'pending'
          supplement = record.supplement || '';
        }

        // 生成唯一ID（结合计划ID和时间槽）
        const uniqueId = `${plan.id}_${timeSlot}`;
        
        // 添加药品信息
        timeGroups[timeKey].medicines.push({
          id: uniqueId,
          planId: plan.id,
          medicineName: plan.medicineName,
          memberName: plan.memberName,
          timeSlot: timeSlot,
          dosage: plan.dosage || '1片',
          status: status,
          supplement: supplement
        });

        timeGroups[timeKey].total++;
        if (status === 'completed') {
          timeGroups[timeKey].completed++;
        }
      });
    });

    // 转换为数组并排序
    return Object.values(timeGroups).sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  },

  /**
   * 药品点击事件
   * @param {Object} e - 事件对象
   */
  onMedicineClick: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    // 这里可以添加展开/收起详细信息的逻辑
  },

  /**
   * 确认服药
   * @param {Object} e - 事件对象
   */
  onConfirmMedicine: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    
    // 检查是否为游客模式
    if (this.data.isGuestMode) {
      // 游客模式：直接更新本地状态
      this.updateMedicineStatus(medicine.id, 'completed');
      wx.showToast({ title: '已确认服药', icon: 'success' });
    } else {
      // 登录模式：调用API创建或更新记录
      wx.showLoading({ title: '处理中...', mask: true });

      DataManager.createOrUpdateRecord(
        medicine.planId,
        this.data.selectedDate,
        medicine.timeSlot,
        'completed'
      ).then((result) => {
        // 等待500ms确保数据已写入
        return new Promise(resolve => setTimeout(resolve, 500));
      }).then(() => {
        // 先加载当天数据
        return this.loadData(this.data.selectedDate);
      }).then(() => {
        // 数据加载完成后，再加载月度状态
        const date = new Date(this.data.selectedDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return this.loadMonthStatus(year, month);
      }).then(() => {
        wx.hideLoading();
        wx.showToast({ title: '已确认服药', icon: 'success' });
      }).catch(error => {
        wx.hideLoading();
        wx.showToast({ title: '操作失败', icon: 'none' });
      });
    }
  },

  /**
   * 跳过服药
   * @param {Object} e - 事件对象
   */
  onSkipMedicine: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    
    wx.showModal({
      title: '跳过服药',
      content: '确定要跳过本次服药吗？',
      success: (res) => {
        if (res.confirm) {
          // 更新本地状态为已跳过
          this.updateMedicineStatus(medicine.id, 'skipped');
          wx.showToast({ title: '已跳过', icon: 'none' });
        }
      }
    });
  },

  /**
   * 稍后服药
   * @param {Object} e - 事件对象
   */
  onLaterMedicine: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    
    wx.showToast({ title: '稍后提醒', icon: 'none' });
    // 这里可以添加延迟提醒的逻辑
  },

  /**
   * 加载模拟数据（游客模式使用）
   */
  loadMockData: function() {
    // 从本地存储读取游客数据
    const savedMedicines = wx.getStorageSync('guest_medicines') || [];
    const savedPlans = wx.getStorageSync('guest_plans') || [];
    const savedRecords = wx.getStorageSync('guest_records') || [];

    // 如果没有保存的数据，使用默认模拟数据
    const mockMedicines = savedMedicines.length > 0 ? savedMedicines : [
      {
        id: 5001,
        name: '阿莫西林胶囊',
        manufacturer: '华北制药',
        specification: '0.25g*24粒',
        dosage: '每次2粒，每日3次，饭后服用',
        stock: 10,
        unit: '盒',
        expiryDate: '2026-06-30',
        category: '抗生素',
        status: 'normal',
        note: '请遵医嘱服用',
        createdAt: '2025-11-15',
        updatedAt: '2025-11-15'
      },
      {
        id: 5002,
        name: '布洛芬缓释胶囊',
        manufacturer: '中美天津史克',
        specification: '0.3g*12粒',
        dosage: '每次1粒，每日2次，疼痛时服用',
        stock: 5,
        unit: '盒',
        expiryDate: '2026-04-30',
        category: '止痛药',
        status: 'normal',
        note: '孕妇禁用',
        createdAt: '2025-12-10',
        updatedAt: '2025-12-10'
      }
    ];

    // 如果没有保存的计划，使用默认模拟计划
    const mockPlans = savedPlans.length > 0 ? savedPlans : [
      {
        id: 6001,
        medicineId: 5001,
        medicineName: '阿莫西林胶囊',
        memberId: 4001,
        memberName: '我',
        frequency: '每日3次',
        timeSlots: ['08:00', '12:00', '18:00'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        note: '饭后服用',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 使用保存的记录或空数组
    const mockRecords = savedRecords;

    // 计算药品统计数据
    const currentDate = new Date();
    let expiring = 0;
    let expired = 0;
    
    mockMedicines.forEach(medicine => {
      try {
        const expiryDate = new Date(medicine.expiryDate);
        const timeDiff = expiryDate - currentDate;
        const daysToExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysToExpiry <= 0) {
          expired++;
        } else if (daysToExpiry <= 90) {
          expiring++;
        }
      } catch (error) {
        console.error('计算药品状态失败:', error);
      }
    });
    
    const total = mockMedicines.length;
    
    // 处理数据，按时间分组
    const timeGroupedPlans = this.groupPlansByTime(mockPlans, mockRecords);

    // 计算药品总数
    const totalMedicinesCount = timeGroupedPlans.reduce((count, group) => {
      return count + group.total;
    }, 0);

    // 更新数据
    this.setData({
      todayPlans: mockPlans,
      timeGroupedPlans: timeGroupedPlans,
      totalMedicinesCount: totalMedicinesCount,
      medicineStats: {
        total,
        expiring,
        expired
      },
      todayRecords: mockRecords,
      loading: false
    });
  },

  /**
   * 更新药品状态
   * @param {string} medicineId - 药品唯一ID
   * @param {string} status - 新状态
   */
  updateMedicineStatus: function(medicineId, status) {
    const { timeGroupedPlans, isGuestMode, todayRecords, selectedDate } = this.data;
    
    // 更新本地数据
    const updatedGroups = timeGroupedPlans.map(group => {
      const updatedMedicines = group.medicines.map(medicine => {
        if (medicine.id === medicineId) {
          return { ...medicine, status: status };
        }
        return medicine;
      });

      // 更新完成计数
      const completed = updatedMedicines.filter(m => m.status === 'completed').length;
      
      return {
        ...group,
        medicines: updatedMedicines,
        completed: completed
      };
    });

    this.setData({ timeGroupedPlans: updatedGroups });

    // 如果是游客模式，保存记录到本地存储
    if (isGuestMode) {
      // 解析medicineId，获取planId和timeSlot
      const [planId, timeSlot] = medicineId.split('_');
      
      // 检查是否已存在该记录
      const existingRecordIndex = todayRecords.findIndex(record => 
        record.planId === planId && record.time === timeSlot
      );
      
      let updatedRecords = [...todayRecords];
      
      if (existingRecordIndex >= 0) {
        // 更新现有记录
        updatedRecords[existingRecordIndex] = {
          ...updatedRecords[existingRecordIndex],
          status: status,
          updatedAt: new Date().toISOString()
        };
      } else {
        // 创建新记录
        const newRecord = {
          id: `record_${Date.now()}`,
          planId: planId,
          medicineName: '',
          memberName: '',
          time: timeSlot,
          date: selectedDate,
          status: status,
          supplement: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedRecords.push(newRecord);
      }
      
      // 保存到本地存储
      wx.setStorageSync('guest_records', updatedRecords);
    }
  }
});
