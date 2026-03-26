const DataManager = require('../../utils/dataManager.js');
const errorHandler = require('../../utils/errorHandler.js');

Page({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    isAdmin: false,
    statusBarHeight: 0,
    
    members: [],
    relationshipRules: [], // 关系规则列表
    
    showAddDialog: false,
    editingMember: null,
    
    formData: {
      phone: '',
      relationship: '本人'  // 使用中文显示
    },
    
    // 关系选择器显示状态
    showRelationPicker: false,
    selectedRelation: '',
    
    relationOptions: [
      { text: '本人', value: '本人' },
      { text: '配偶', value: '配偶' },
      { text: '父亲', value: '父亲' },
      { text: '母亲', value: '母亲' },
      { text: '儿子', value: '儿子' },
      { text: '女儿', value: '女儿' },
      { text: '爷爷', value: '爷爷' },
      { text: '奶奶', value: '奶奶' },
      { text: '外公', value: '外公' },
      { text: '外婆', value: '外婆' },
      { text: '其他', value: '其他' }
    ],
    
    // 关系映射表（英文到中文）
    relationMap: {
      'self': '本人',
      'spouse': '配偶',
      'father': '父亲',
      'mother': '母亲',
      'son': '儿子',
      'daughter': '女儿',
      'grandfather_paternal': '爷爷',
      'grandmother_paternal': '奶奶',
      'grandfather_maternal': '外公',
      'grandmother_maternal': '外婆',
      'other': '其他',
      'member': '成员'
    },
    
    // 中文到英文的映射表
    relationMapReverse: {
      '本人': 'self',
      '配偶': 'spouse',
      '父亲': 'father',
      '母亲': 'mother',
      '儿子': 'son',
      '女儿': 'daughter',
      '爷爷': 'grandfather_paternal',
      '奶奶': 'grandmother_paternal',
      '外公': 'grandfather_maternal',
      '外婆': 'grandmother_maternal',
      '其他': 'other'
    }
  },

  onLoad: function() {
    this.getSystemInfo();
    this.checkLoginStatus();
    this.loadRelationshipRules();
    this.loadMembers();
  },

  onShow: function() {
    this.checkLoginStatus();
    this.loadRelationshipRules();
    this.loadMembers();
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

  getSystemInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          statusBarHeight: res.statusBarHeight
        });
      }
    });
  },

  loadMembers: function() {
    if (this.data.isGuestMode) {
      this.setData({
        members: [
          { id: 1, name: '妈妈', avatar: '妈', relation: '母亲', phone: '' },
          { id: 2, name: '爸爸', avatar: '爸', relation: '父亲', phone: '' },
          { id: 3, name: '爷爷', avatar: '爷', relation: '父亲', phone: '' },
          { id: 4, name: '奶奶', avatar: '奶', relation: '母亲', phone: '' }
        ]
      });
      return;
    }

    const familyId = DataManager.getCurrentFamilyId();
    if (!familyId) {
      wx.showToast({
        title: '请先选择家庭',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    // 使用正确的API获取当前家庭中加入的用户成员
    DataManager.getFamilyMembers(familyId).then(members => {
      wx.hideLoading();
      
      // 将用户成员数据映射为显示格式
      const formattedMembers = (members || []).map(member => {
        const relationshipKey = member.relationship || 'member';
        const relationCn = this.data.relationMap[relationshipKey] || '成员';

        // 头像优先级：
        // 1）后端提供的头像 URL
        // 2）关系对应的中文（本人/母亲/父亲等）的首字
        // 3）昵称首字
        // 4）兜底用“用”
        let avatarText = '用';
        if (relationCn && relationCn.length > 0) {
          avatarText = relationCn.charAt(0);
        } else if (member.nickname) {
          avatarText = member.nickname.charAt(0);
        }

        // 兼容后端字段：可能返回 avatarUrl 或 avatar，统一转成完整 URL
        const rawAvatarPath = member.avatarUrl || member.avatar || '';
        const avatarUrl = DataManager.getFileUrl(rawAvatarPath);
        const avatar = avatarUrl || avatarText;

        return {
          id: member.userId,
          name: member.nickname || '未设置昵称',
          avatar,
          // 始终展示中文关系，不展示英文编码，避免“看起来像乱码”
          relation: relationCn,
          relationshipKey,  // 保存英文key用于编辑
          phone: member.phone || '',
          role: member.role
        };
      });
      
      this.setData({ members: formattedMembers });
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  loadRelationshipRules: function() {
    if (this.data.isGuestMode) {
      return;
    }

    DataManager.getRelationshipRules().then(rules => {
      // 保存规则数据，用于后续验证
      this.setData({ relationshipRules: rules });
      
      // 更新关系选项，显示中文名称和限制
      const relationOptions = rules.map(rule => {
        const textCn = this.data.relationMap[rule.relationship] || rule.relationship;
        const limit = rule.max_count ? ` (限${rule.max_count}个)` : '';
        return {
          text: textCn + limit,
          value: textCn  // 使用中文作为value
        };
      });
      
      // 更新反向映射表，确保包含所有规则
      const relationMapReverse = {};
      rules.forEach(rule => {
        const textCn = this.data.relationMap[rule.relationship];
        if (textCn) {
          relationMapReverse[textCn] = rule.relationship;
        }
      });
      
      this.setData({ 
        relationOptions,
        relationMapReverse: { ...this.data.relationMapReverse, ...relationMapReverse }
      });
    }).catch(error => {
      // 加载关系规则失败
    });
  },

  onAddMember: function() {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能添加家庭成员',
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
      editingMember: null,
      formData: {
        phone: '',
        relationship: '本人'  // 使用中文显示
      }
    });
  },

  onEditMember: function(e) {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能编辑家庭成员',
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

    const member = e.currentTarget.dataset.member;
    
    // 只能修改关系，不能修改手机号
    this.setData({
      editingMember: member,
      showAddDialog: true,
      formData: {
        phone: member.phone || '',
        relationship: member.relation || '本人'  // 使用中文显示
      }
    });
  },

  onDeleteMember: function(e) {
    if (this.data.isGuestMode) {
      wx.showModal({
        title: '登录提示',
        content: '需要登录才能删除家庭成员',
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

    const member = e.currentTarget.dataset.member;
    const familyId = DataManager.getCurrentFamilyId();
    
    wx.showModal({
      title: '确认移除',
      content: `确定要移除"${member.name}"吗？`,
      confirmText: '移除',
      confirmColor: '#e74c3c',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            await DataManager.removeMember(familyId, member.id);
            wx.showToast({
              title: '移除成功',
              icon: 'success'
            });
            this.loadMembers();
          } catch (error) {
            wx.showToast({
              title: error.message || '移除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },



  onNameInput: function(e) {
    let phone = '';
    if (e && e.detail) {
      if (e.detail.value !== undefined) {
        phone = e.detail.value;
      } else if (e.detail !== undefined) {
        phone = e.detail;
      }
    }
    this.setData({
      'formData.phone': phone
    });
  },

  onPhoneInput: function(e) {
    let phone = '';
    if (e && e.detail) {
      if (e.detail.value !== undefined) {
        phone = e.detail.value;
      } else if (e.detail !== undefined) {
        phone = e.detail;
      }
    }
    this.setData({
      'formData.phone': phone
    });
  },

  /**
   * 显示关系选择器
   */
  showRelationPicker: function() {
    // 重置选中状态
    this.setData({
      showRelationPicker: true,
      selectedRelation: this.data.formData.relationship
    });
  },

  /**
   * 关闭关系选择器
   */
  onCloseRelationPicker: function() {
    this.setData({ showRelationPicker: false });
  },

  /**
   * 处理关系项点击
   */
  onRelationItemClick: function(e) {
    const relation = e.currentTarget.dataset.value;
    this.setData({ selectedRelation: relation });
  },

  /**
   * 处理确认选择关系
   */
  onRelationConfirm: function() {
    const relation = this.data.selectedRelation;
    if (relation) {
      this.setData({
        'formData.relationship': relation,
        showRelationPicker: false
      });
    }
  },

  onAvatarUpload: function(e) {
    // 阻止事件冒泡，避免触发onEditMember
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        wx.showLoading({
          title: '上传中...',
          mask: true
        });

        // 模拟上传成功
        setTimeout(() => {
          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
          // 这里可以更新头像数据
        }, 1000);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  onSubmit: function() {
    const { phone, relationship } = this.data.formData;
    const familyId = DataManager.getCurrentFamilyId();
    
    // 将中文关系转换为英文
    const relationshipEn = this.data.relationMapReverse[relationship] || relationship;
    
    // 如果是编辑模式，只能修改关系
    if (this.data.editingMember) {
      wx.showLoading({
        title: '保存中...',
        mask: true
      });

      DataManager.updateMemberRelationship(familyId, this.data.editingMember.id, relationshipEn)
        .then(() => {
          wx.hideLoading();
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
          this.onCloseDialog();
          this.loadMembers();
        })
        .catch(error => {
          wx.hideLoading();
          wx.showToast({
            title: error.message || '修改失败',
            icon: 'none'
          });
        });
      return;
    }

    // 添加新成员
    if (!phone.trim()) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '添加中...',
      mask: true
    });

    DataManager.addFamilyMemberByPhone(familyId, phone.trim(), relationshipEn)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        this.onCloseDialog();
        this.loadMembers();
      })
      .catch(error => {
        wx.hideLoading();

        // 尽量从后端错误中提取明确原因
        const rawMessage =
          (error && error.message) ||
          (error && error.data && error.data.message) ||
          '';

        // 默认给出最常见的两种失败原因提示
        let friendlyMessage = '添加失败：请确认该手机号已在本小程序注册，且该成员在当前家庭中没有重复的关系。';

        // 后端常见错误：用户未注册
        if (
          /未注册/.test(rawMessage) ||
          /not\s*registered/i.test(rawMessage) ||
          error.code === 'USER_NOT_REGISTERED'
        ) {
          friendlyMessage = '该手机号对应的用户尚未注册，请提醒对方先在小程序完成注册';
        }

        // 后端常见错误：该关系已存在/已加入家庭
        if (
          /关系已存在/.test(rawMessage) ||
          /已加入该家庭/.test(rawMessage) ||
          /already\s*exists/i.test(rawMessage) ||
          error.code === 'RELATIONSHIP_EXISTS'
        ) {
          friendlyMessage = '该成员在当前家庭中已存在该关系，请确认是否重复添加';
        }

        wx.showToast({
          title: friendlyMessage,
          icon: 'none',
          duration: 3000
        });
      });
  },

  onCloseDialog: function() {
    this.setData({
      showAddDialog: false,
      editingMember: null,
      showRelationPicker: false,
      formData: {
        phone: '',
        relationship: '本人'  // 使用中文显示
      }
    });
  },

  onPullDownRefresh: function() {
    this.loadMembers();
    wx.stopPullDownRefresh();
  }
});