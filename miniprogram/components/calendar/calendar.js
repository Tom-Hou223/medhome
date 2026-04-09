/**
 * 单月日历组件
 * 功能：
 * 1. 默认显示当前月份的完整日历视图
 * 2. 添加"今日"快捷按钮
 * 3. 日期高亮显示规则
 * 4. 清晰的界面布局
 * 5. 流畅的交互体验
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 初始选中的日期（YYYY-MM-DD格式）
    value: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (newVal) {
          this.setData({
            selectedDate: newVal
          });
          this.generateCalendar();
        }
      }
    },
    // 日期状态映射表 {dateStr: 'done'|'pending'|'missed'}
    dayStatusMap: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.generateCalendar();
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 当前显示的年份
    currentYear: 0,
    // 当前显示的月份
    currentMonth: 0,
    // 选中的日期（YYYY-MM-DD格式）
    selectedDate: '',
    // 日历日期数组
    calendarDays: [],
    // 星期标识
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    // 年份列表
    yearList: [],
    // 月份列表
    monthList: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    // 年份索引
    yearIndex: 0,
    // 月份索引
    monthIndex: 0
  },

  /**
   * 组件生命周期函数
   */
  attached: function() {
    this.initCalendar();
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化日历
     */
    initCalendar: function() {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const selectedDate = this.properties.value || this.formatDate(today);

      // 生成年份列表（当前年份前后5年）
      const yearList = [];
      for (let i = year - 5; i <= year + 5; i++) {
        yearList.push(i);
      }

      // 计算年份索引
      const yearIndex = yearList.indexOf(year);
      // 计算月份索引
      const monthIndex = month - 1;

      this.setData({
        currentYear: year,
        currentMonth: month,
        selectedDate: selectedDate,
        yearList: yearList,
        yearIndex: yearIndex,
        monthIndex: monthIndex
      });

      this.generateCalendar();
    },

    /**
     * 生成日历数据
     */
    generateCalendar: function() {
      const year = this.data.currentYear;
      const month = this.data.currentMonth;
      const selectedDate = this.data.selectedDate;
      const todayStr = this.formatDate(new Date());
      const dayStatusMap = this.properties.dayStatusMap || {};

      const calendarDays = [];

      // 获取当月第一天
      const firstDay = new Date(year, month - 1, 1);
      // 获取当月第一天是星期几（0-6，0是星期日）
      const firstDayWeek = firstDay.getDay();
      
      // 计算需要填充的空白日期数量
      // 星期标识顺序：一 二 三 四 五 六 日
      // 所以：
      // 星期一（1）对应索引0，需要0个空白
      // 星期二（2）对应索引1，需要1个空白
      // ...
      // 星期六（6）对应索引5，需要5个空白
      // 星期日（0）对应索引6，需要6个空白
      const emptyDaysCount = firstDayWeek === 0 ? 6 : firstDayWeek - 1;

      // 添加空白日期
      for (let i = 0; i < emptyDaysCount; i++) {
        calendarDays.push({
          day: '',
          dateStr: '',
          isToday: false,
          isSelected: false,
          status: 'none'
        });
      }

      // 获取当月天数
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // 添加当月日期
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month - 1, i);
        const dateStr = this.formatDate(date);
        const status = dayStatusMap[dateStr] || '';
        
        calendarDays.push({
          day: i,
          dateStr: dateStr,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate,
          status: status
        });
      }

      this.setData({
        calendarDays: calendarDays
      });
    },

    /**
     * 格式化日期为 YYYY-MM-DD 格式
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    formatDate: function(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    /**
     * 回到当天
     */
    onBackToToday: function() {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const selectedDateStr = this.formatDate(today);

      // 计算年份索引
      const yearIndex = this.data.yearList.indexOf(year);
      // 计算月份索引
      const monthIndex = month - 1;

      this.setData({
        currentYear: year,
        currentMonth: month,
        selectedDate: selectedDateStr,
        yearIndex: yearIndex,
        monthIndex: monthIndex
      });

      this.generateCalendar();

      // 触发日期选择事件
      this.triggerEvent('select', {
        value: selectedDateStr
      });
    },

    /**
     * 日期点击事件
     * @param {Object} e - 事件对象，包含点击的日期信息
     */
    onDayClick: function(e) {
      const dateStr = e.currentTarget.dataset.date;
      
      if (!dateStr) {
        return;
      }

      this.setData({
        selectedDate: dateStr
      });

      this.generateCalendar();

      // 触发日期选择事件
      this.triggerEvent('select', {
        value: dateStr
      });
    },

    /**
     * 年份选择器变化事件
     * @param {Object} e - 事件对象，包含选择的年份索引
     */
    onYearChange: function(e) {
      const yearIndex = e.detail.value;
      const year = this.data.yearList[yearIndex];

      this.setData({
        currentYear: year,
        yearIndex: yearIndex
      });

      this.generateCalendar();
      
      // 触发月份变化事件，通知父组件加载新月份的数据
      this.triggerEvent('monthchange', {
        year: year,
        month: this.data.currentMonth
      });
    },

    /**
     * 月份选择器变化事件
     * @param {Object} e - 事件对象，包含选择的月份索引
     */
    onMonthChange: function(e) {
      const monthIndex = e.detail.value;
      const month = this.data.monthList[monthIndex];

      this.setData({
        currentMonth: month,
        monthIndex: monthIndex
      });

      this.generateCalendar();
      
      // 触发月份变化事件，通知父组件加载新月份的数据
      this.triggerEvent('monthchange', {
        year: this.data.currentYear,
        month: month
      });
    }
  }
});