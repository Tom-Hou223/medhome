const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isAdmin: false,
    isSeniorMode: false,
    seniorTheme: 'white',
    loading: false,
    statusBarHeight: 0,
    
    plans: [],
    filterType: 'all',

    familyMembers: [],
    selectedMemberId: null,
    selectedMemberName: '',
    selectedMemberRole: '',
    
    showAddDialog: false,
    editingPlan: null,
    showDatePicker: false,
    datePickerType: 'start',
    showTimePicker: false,
    showStartDatetimePicker: false,
    startDatetimeValue: new Date().getTime(),
    startDatetimeMin: new Date().getTime(),
    currentTime: '08:00',
    showMedicinePicker: false,
    
    formData: {
      medicineId: '',
      memberId: '',
      startDate: '',
      endDate: '',
      timeSlots: [],
      frequency: 'daily',
      notes: '',
      medicineName: '',
      memberName: ''
    },
    
    medicines: [],
    members: [],
    
    frequencyOptions: [
      { label: '每日', value: 'daily' },
      { label: '每周', value: 'weekly' },
      { label: '每月', value: 'monthly' }
    ],
    
    frequencyIndex: 0,
    currentDate: new Date().getTime(),
    minDate: new Date().getTime() - 30 * 24 * 60 * 60 * 1000, // 30天前
    maxDate: new Date().getTime() + 365 * 24 * 60 * 60 * 1000 // 1年后
  },

  onLoad: function() {
    var self = this;
    self.getSystemInfo();
    self.checkLoginStatus();
    self.initSeniorMode();
    self.restoreMemberState();
    self.loadFamilyMembers().then(function() {
      if (!self.data.selectedMemberId && !self.data.selectedMemberName && self.data.isAdmin && self.data.familyMembers.length > 0) {
        self.selectDefaultMember();
      }
    });
    self.loadPlans();
    self.loadMedicines();
    self.loadMembers();
    self.updateTabBar();
  },

  onShow: function() {
    var self = this;
    self.checkLoginStatus();
    self.initSeniorMode();
    self.restoreMemberState();
    self.loadFamilyMembers().then(function() {
      if (!self.data.selectedMemberId && !self.data.selectedMemberName && self.data.isAdmin && self.data.familyMembers.length > 0) {
        self.selectDefaultMember();
      }
    });
    self.loadPlans();
    self.loadMedicines();
    self.loadMembers();
    self.updateTabBar();
  },

  checkLoginStatus: function() {
    const mode = DataManager.getCurrentMode();
    const isAdmin = DataManager.isAdmin();
    this.setData({
      isLoggedIn: mode.isLoggedIn,
      isGuestMode: mode.isGuestMode,
      isAdmin: isAdmin
    });
  },

  restoreMemberState: function() {
    const selectedMemberId = wx.getStorageSync('selectedMemberId');
    const selectedMemberName = wx.getStorageSync('selectedMemberName') || '';
    const selectedMemberRole = wx.getStorageSync('selectedMemberRole') || '';
    this.setData({
      selectedMemberId: selectedMemberId || null,
      selectedMemberName: selectedMemberName,
      selectedMemberRole: selectedMemberRole
    });
  },

  selectDefaultMember: function() {
    var currentUserId = DataManager.getCurrentUserId();
    var member = null;
    if (currentUserId) {
      member = this.data.familyMembers.find(function(m) {
        return String(m.id) === String(currentUserId);
      });
    }
    if (!member) {
      member = this.data.familyMembers[0];
    }
    if (member) {
      this.setData({
        selectedMemberId: member.id,
        selectedMemberName: member.name,
        selectedMemberRole: member.role || ''
      });
      wx.setStorageSync('selectedMemberId', member.id);
      wx.setStorageSync('selectedMemberName', member.name);
      wx.setStorageSync('selectedMemberRole', member.role || '');
      this.loadPlans();
    }
  },

  onMemberChange: function(e) {
    const { memberId, memberName } = e.detail;
    
    let selectedMemberRole = '';
    if (memberId) {
      const member = this.data.familyMembers.find(m => String(m.id) === String(memberId));
      selectedMemberRole = member ? member.role : '';
    }
    
    wx.setStorageSync('selectedMemberId', memberId || '');
    wx.setStorageSync('selectedMemberName', memberName);
    wx.setStorageSync('selectedMemberRole', selectedMemberRole);
    
    this.setData({
      selectedMemberId: memberId || null,
      selectedMemberName: memberName,
      selectedMemberRole: selectedMemberRole
    });
    
    this.loadPlans();
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
      const isSeniorMode = wx.getStorageSync('seniorMode') || false;
      this.getTabBar().setData({
        selected: isSeniorMode ? 0 : 1
      });
      this.getTabBar().updateTabBar();
    }
  },

  loadFamilyMembers: function() {
    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      this.setData({ familyMembers: [] });
      return Promise.resolve();
    }
    
    return DataManager.getFamilyMembers(familyId).then(members => {
      const formatted = (members || []).map(m => ({
        id: m.userId,
        name: m.nickname || '未设置昵称',
        role: m.role || 'member'
      }));
      this.setData({ familyMembers: formatted });
    }).catch(() => {
      return DataManager.getFamilyMembersList().then(res => {
        const list = res.data || [];
        const formatted = list.map(m => ({
          id: m.id || m.userId,
          name: m.name || m.nickname || '未设置昵称',
          role: m.role || 'member'
        }));
        this.setData({ familyMembers: formatted });
      }).catch(() => {
        this.setData({ familyMembers: [] });
      });
    });
  },

  loadPlans: function(filterType = null) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    DataManager.getPlans().then(res => {
      wx.hideLoading();
      
      let plans = res.data || [];

      // 格式化日期为 YYYY-MM-DD
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // 自动更新计划状态并格式化日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      plans = plans.map(plan => {
        // 格式化日期
        plan.startDate = formatDate(plan.startDate);
        plan.endDate = formatDate(plan.endDate);
        
        // 如果有结束日期且结束日期已过，标记为已结束
        if (plan.endDate) {
          const endDate = new Date(plan.endDate);
          endDate.setHours(0, 0, 0, 0);
          if (endDate < today && plan.status === 'active') {
            plan.status = 'ended';
          }
        }
        return plan;
      });
      
      if (this.data.isAdmin && this.data.selectedMemberName) {
        plans = plans.filter(function(plan) {
          return plan.memberName === this.data.selectedMemberName;
        }.bind(this));
      } else if (!this.data.isAdmin) {
        var userInfo = wx.getStorageSync('userInfo');
        var currentUserName = userInfo ? (userInfo.nickname || '') : '';
        if (currentUserName) {
          plans = plans.filter(function(plan) {
            return plan.memberName === currentUserName;
          });
        }
      }
      
      // 根据 filterType 过滤，默认为 'all'
      const currentFilterType = filterType !== null ? filterType : (this.data.filterType || 'all');
      
      // 确保过滤逻辑正确执行
      if (currentFilterType === 'active') {
        plans = plans.filter(plan => plan.status === 'active');
      } else if (currentFilterType === 'ended') {
        plans = plans.filter(plan => plan.status === 'ended' || plan.status === 'completed');
      }
      // 如果是 'all'，则不进行过滤
      
      this.setData({
        plans: plans,
        loading: false,
        filterType: currentFilterType
      });
    }).catch(error => {
      wx.hideLoading();
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  loadMedicines: function() {
    DataManager.getMedicines().then(res => {
      this.setData({ medicines: res.data });
    }).catch(error => {
      console.error('加载药品列表失败:', error);
      // 不显示错误提示，避免打扰用户
    });
  },

  loadMembers: function() {
    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      this.setData({ members: [] });
      return Promise.resolve([]);
    }

    // 优先使用“家庭共享”新接口：/families/{id}/members
    return DataManager.getFamilyMembers(familyId).then(members => {
      const formatted = (members || []).map(m => ({
        id: m.userId,
        name: m.nickname || '未设置昵称'
      }));
      this.setData({ members: formatted });
      return formatted;
    }).catch(error => {
      return DataManager.getFamilyMembersList().then(res => {
        const list = res.data || [];
        const formatted = list.map(m => ({
          id: m.id || m.userId,
          name: m.name || m.nickname || '未设置昵称'
        }));
        this.setData({ members: formatted });
        return formatted;
      }).catch(err2 => {
        this.setData({ members: [] });
        return [];
      });
    });
  },

  onFilterChange: function(e) {
    let filterType = 'all';
    
    // 处理 van-tabs 组件的 change 事件
    if (e.detail && e.detail.name) {
      filterType = e.detail.name;
    } else if (e.detail && typeof e.detail === 'number') {
      // 兼容索引形式的返回值
      const tabNames = ['all', 'active', 'ended'];
      if (e.detail >= 0 && e.detail < tabNames.length) {
        filterType = tabNames[e.detail];
      }
    }

    // 确保过滤类型有效
    if (!filterType || (filterType !== 'all' && filterType !== 'active' && filterType !== 'ended')) {
      filterType = 'all';
    }
    
    this.setData({
      filterType: filterType
    });

    this.loadPlans(filterType);
  },

  onAddPlan: function() {
    // 先更新登录状态
    this.checkLoginStatus();

    // 直接从DataManager获取最新登录状态
    const mode = DataManager.getCurrentMode();
    if (mode.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能添加用药计划',
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

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showAddDialog: true,
      editingPlan: null,
      formData: {
        medicineId: '',
        medicineName: '',
        memberId: '',
        memberName: '',
        startDate: '',
        endDate: '',
        timeSlots: [],
        frequency: 'daily',
        notes: ''
      }
    });
  },

  onEditPlan: function(e) {
    // 先更新登录状态
    this.checkLoginStatus();

    // 直接从DataManager获取最新登录状态
    const mode = DataManager.getCurrentMode();
    if (mode.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能编辑用药计划',
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

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    const plan = e.currentTarget.dataset.plan;

    // 格式化日期为 YYYY-MM-DD
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    this.setData({
      editingPlan: plan,
      showAddDialog: true,
      formData: {
        medicineId: plan.medicineId || '',
        medicineName: plan.medicineName || '',
        memberId: plan.memberId || '',
        memberName: plan.memberName || '',
        startDate: formatDate(plan.startDate),
        endDate: formatDate(plan.endDate),
        timeSlots: Array.isArray(plan.timeSlots) ? plan.timeSlots : [],
        frequency: plan.frequency || 'daily',
        notes: plan.notes || ''
      }
    });
  },

  onDeletePlan: function(e) {
    // 先更新登录状态
    this.checkLoginStatus();

    // 直接从DataManager获取最新登录状态
    const mode = DataManager.getCurrentMode();
    if (mode.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能删除用药计划',
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

    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    const plan = e.currentTarget.dataset.plan;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除该用药计划吗？`,
      confirmText: '删除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await DataManager.deletePlan(plan.id);
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            this.loadPlans();
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

  onSubmit: function() {
    const { medicineId, medicineName, memberId, memberName, startDate, endDate, timeSlots, frequency, notes } = this.data.formData;

    // 验证必填项
    if (!medicineName || medicineName.trim() === '') {
      wx.showToast({
        title: '请选择药品',
        icon: 'none'
      });
      return;
    }

    if (!memberName || memberName.trim() === '') {
      wx.showToast({
        title: '请选择成员',
        icon: 'none'
      });
      return;
    }

    if (!startDate || startDate.trim() === '') {
      wx.showToast({
        title: '请选择开始日期',
        icon: 'none'
      });
      return;
    }

    var startError = this.validateStartDatetime(startDate);
    if (startError) {
      wx.showModal({
        title: '开始时间无效',
        content: startError,
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    if (!timeSlots || timeSlots.length === 0) {
      wx.showToast({
        title: '请选择服药时间',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    const planData = {
      medicineId: medicineId || null,
      medicineName: medicineName.trim(),
      memberId,
      memberName: memberName.trim(),
      startDate,
      endDate: endDate || null,
      timeSlots,
      frequency,
      notes: notes ? notes.trim() : '',
      status: 'active'
    };

    const promise = this.data.editingPlan 
      ? DataManager.updatePlan(this.data.editingPlan.id, planData)
      : DataManager.addPlan(planData);

    promise.then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      this.onCloseDialog();
      this.loadPlans();
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
  },

  onCloseDialog: function() {
    this.setData({
      showAddDialog: false,
      editingPlan: null,
      formData: {
        medicineId: '',
        medicineName: '',
        memberId: '',
        memberName: '',
        startDate: '',
        endDate: '',
        timeSlots: [],
        frequency: 'daily',
        notes: ''
      }
    });
  },

  onPullDownRefresh: function() {
    this.loadPlans();
    wx.stopPullDownRefresh();
  },

  // 药品选择
  onMedicineSelect: function() {
    // 显示药品选择菜单
    wx.showActionSheet({
      itemList: ['从药品库选择', '手动输入药品'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 从药品库选择
          this.showMedicineListModal();
        } else if (res.tapIndex === 1) {
          // 手动输入药品
          this.showManualInputModal();
        }
      }
    });
  },

  // 显示手动输入模态框
  showManualInputModal: function() {
    wx.showModal({
      title: '手动输入药品',
      content: '请输入药品名称',
      editable: true,
      placeholderText: '例如：健胃消食片',
      success: (modalRes) => {
        if (modalRes.confirm && modalRes.content.trim()) {
          this.setData({
            'formData.medicineId': '', // 手动输入时不需要medicineId
            'formData.medicineName': modalRes.content.trim()
          });
        }
      }
    });
  },

  // 显示药品列表弹窗
  showMedicineListModal: function() {
    const medicines = this.data.medicines ? this.data.medicines : [];
    
    if (medicines.length === 0) {
      wx.showToast({
        title: '药品库为空',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ showMedicinePicker: true });
  },

  onCloseMedicinePicker: function() {
    this.setData({ showMedicinePicker: false });
  },

  onSelectMedicineItem: function(e) {
    const medicine = e.currentTarget.dataset.medicine;
    this.setData({
      'formData.medicineId': medicine.id,
      'formData.medicineName': medicine.name,
      showMedicinePicker: false
    });
  },

  // 成员选择
  onMemberSelect: function() {
    const openActionSheet = () => {
      wx.showActionSheet({
        itemList: this.data.members.map(member => member.name),
        success: (res) => {
          const selectedMember = this.data.members[res.tapIndex];
          this.setData({
            'formData.memberId': selectedMember.id,
            'formData.memberName': selectedMember.name
          });
        }
      });
    };

    // 若用户点得很快，成员可能还没加载完：这里做一次主动刷新兜底
    if (!this.data.members || this.data.members.length === 0) {
      wx.showLoading({ title: '加载成员中...', mask: true });
      this.loadMembers().then(list => {
        wx.hideLoading();
        if (!list || list.length === 0) {
          wx.showToast({ title: '暂无成员数据', icon: 'none' });
          return;
        }
        openActionSheet();
      }).catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '暂无成员数据', icon: 'none' });
      });
      return;
    }

    openActionSheet();
  },

  // 开始日期选择
  onStartDateSelect: function() {
    var existing = this.data.formData.startDate;
    var now = new Date().getTime();
    var initialValue = now;
    var showDatePicker = true;
    var datePickerType = 'start';
    
    if (existing) {
      var parsed = this.parseDatetimeString(existing);
      if (parsed > 0) {
        initialValue = parsed;
      }
    }
    
    this.setData({
      startDatetimeValue: initialValue,
      startDatetimeMin: now,
      datePickerType: datePickerType,
      showDatePicker: showDatePicker
    });
  },

  onStartDatetimeConfirm: function(e) {
    var timestamp = e.detail;
    var selectedStr = this.formatDatetime(timestamp);
    
    var errorMsg = this.validateStartDatetime(selectedStr);
    if (errorMsg) {
      wx.showToast({ title: errorMsg, icon: 'none', duration: 3000 });
      return;
    }
    
    this.setData({
      'formData.startDate': selectedStr,
      showDatePicker: false,
      startDatetimeValue: timestamp
    });
  },

  onStartDatetimeCancel: function() {
    this.setData({ showDatePicker: false });
  },

  // 结束日期选择
  onEndDateSelect: function() {
    try {
      this.setData({ showDatePicker: true, datePickerType: 'end' });
    } catch (error) {
      wx.showToast({ title: '日期选择失败', icon: 'none' });
    }
  },

  // 频率点击
  onFrequencyTap: function() {
    // 使用actionSheet显示频率选项
    const frequencyLabels = this.data.frequencyOptions.map(option => option.label);
    
    wx.showActionSheet({
      itemList: frequencyLabels,
      success: (res) => {
        const index = res.tapIndex;
        this.setData({
          frequencyIndex: index,
          'formData.frequency': this.data.frequencyOptions[index].value
        });
      }
    });
  },

  // 频率选择（保留原函数，以防需要）
  onFrequencyChange: function(e) {
    const index = e.detail.value;
    this.setData({
      frequencyIndex: index,
      'formData.frequency': this.data.frequencyOptions[index].value
    });
  },

  // 时间选择
  onTimeSelect: function() {
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    this.setData({
      showTimePicker: true,
      currentTime: currentTime
    });
  },

  // 时间选择确认
  onTimeConfirm: function(e) {
    const timeStr = e.detail;
    
    const currentTimeSlots = [...this.data.formData.timeSlots];
    if (!currentTimeSlots.includes(timeStr)) {
      currentTimeSlots.push(timeStr);
      // 按时间排序
      currentTimeSlots.sort();
      this.setData({ 
        'formData.timeSlots': currentTimeSlots,
        showTimePicker: false
      });
    } else {
      wx.showToast({
        title: '该时间已添加',
        icon: 'none'
      });
      this.setData({ showTimePicker: false });
    }
  },

  // 时间选择取消
  onTimeCancel: function() {
    this.setData({ showTimePicker: false });
  },

  // 删除时间段
  onRemoveTimeSlot: function(e) {
    const index = e.currentTarget.dataset.index;
    const currentTimeSlots = [...this.data.formData.timeSlots];
    currentTimeSlots.splice(index, 1);
    this.setData({ 'formData.timeSlots': currentTimeSlots });
  },

  // 备注输入
  onNotesChange: function(e) {
    this.setData({ 'formData.notes': e.detail.value });
  },

  // 日历选择事件（自定义组件）
  onCalendarSelect: function(e) {
    var selectedDate = e.detail.value;
    if (this.data.datePickerType === 'end') {
      this.setData({ 'formData.endDate': selectedDate });
    }
  },

  // 日期选择确认（自定义按钮）
  onDateConfirm: function() {
    this.setData({ showDatePicker: false });
  },

  // 日期选择取消
  onDateCancel: function() {
    this.setData({ showDatePicker: false });
  },

  formatDatetime: function(timestamp) {
    var date = new Date(timestamp);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hour = String(date.getHours()).padStart(2, '0');
    var minute = String(date.getMinutes()).padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  parseDatetimeString: function(datetimeStr) {
    if (!datetimeStr) return 0;
    var parts = datetimeStr.split(' ');
    if (parts.length === 2) {
      return new Date(parts[0] + 'T' + parts[1] + ':00').getTime();
    }
    return new Date(datetimeStr + 'T00:00:00').getTime();
  },

  validateStartDatetime: function(datetimeStr) {
    if (!datetimeStr) return null;
    
    var selectedTime = this.parseDatetimeString(datetimeStr);
    if (selectedTime <= 0) return null;
    
    var now = new Date().getTime();
    
    if (selectedTime < now) {
      return '开始时间不能早于当前时间。' + '\n' +
             '当前时间：' + this.formatDatetime(now) + '\n' +
             '请选择当前时间或之后的时间点。';
    }
    
    return null;
  }
};