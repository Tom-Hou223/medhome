const DataManager = require('../../utils/dataManager.js');

Page({
  data: {
    family: null,
    members: [],
    loading: true,
    isAdmin: false,
    showInviteDialog: false,
    inviteCode: '',
    inviteCodeExpiresAt: ''
  },

  onLoad: function() {
    try {
      const family = DataManager.getCurrentFamily();
      if (!family || !family.id) {
        wx.showToast({
          title: '请先选择家庭',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      this.setData({
        family,
        isAdmin: family.role === 'admin'
      });

      this.loadFamilyDetail();
      this.loadMembers();
    } catch (error) {
      console.error('onLoad 错误:', error);
      wx.showToast({
        title: '页面加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  async loadFamilyDetail() {
    try {
      const detail = await DataManager.getFamilyDetail(this.data.family.id);
      this.setData({
        family: { ...this.data.family, ...detail },
        inviteCode: detail.inviteCode || '',
        inviteCodeExpiresAt: detail.inviteCodeExpiresAt || ''
      });
    } catch (error) {
      console.error('加载家庭详情失败:', error);
      wx.showToast({
        title: '加载家庭详情失败',
        icon: 'none'
      });
    }
  },

  // 格式化时间为 YYYY-MM-DD HH:mm:ss
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // 检查是否为有效日期
      if (isNaN(date.getTime())) {
        return '';
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('格式化时间失败:', error);
      return '';
    }
  },

  async loadMembers() {
    this.setData({ loading: true });

    try {
      const members = await DataManager.getFamilyMembers(this.data.family.id);
      
      // 确保 members 是数组
      const memberList = Array.isArray(members) ? members : [];
      
      // 处理头像URL和格式化时间
      const processedMembers = memberList.map(member => {
        if (!member) return null;
        
        if (member.avatarUrl) {
          try {
            member.avatarUrl = DataManager.getFileUrl(member.avatarUrl);
          } catch (urlError) {
            console.error('处理头像URL失败:', urlError);
            member.avatarUrl = '';
          }
        }
        // 格式化加入时间
        try {
          member.formattedJoinTime = this.formatDateTime(member.joinedAt);
        } catch (dateError) {
          console.error('格式化时间失败:', dateError);
          member.formattedJoinTime = '';
        }
        return member;
      }).filter(Boolean); // 过滤掉 null 值
      
      this.setData({
        members: processedMembers,
        loading: false
      });
    } catch (error) {
      console.error('加载成员失败:', error);
      this.setData({ 
        members: [],
        loading: false 
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  showInviteDialog() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    this.setData({ showInviteDialog: true });
  },

  hideInviteDialog() {
    this.setData({ showInviteDialog: false });
  },

  async onGenerateInviteCode() {
    wx.showLoading({
      title: '生成中...',
      mask: true
    });

    try {
      const result = await DataManager.generateInviteCode(this.data.family.id);
      wx.hideLoading();

      this.setData({
        inviteCode: result.inviteCode,
        inviteCodeExpiresAt: result.expiresAt
      });

      wx.showToast({
        title: '生成成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none'
      });
    }
  },

  onCopyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        });
      }
    });
  },

  onMemberTap(e) {
    const { member } = e.currentTarget.dataset;

    if (!this.data.isAdmin) {
      return;
    }

    // 不能操作创建者
    if (this.data.family.creatorId && member.userId === this.data.family.creatorId) {
      wx.showToast({
        title: '不能操作创建者',
        icon: 'none'
      });
      return;
    }

    const actions = [
      member.role === 'admin' ? '设为普通成员' : '设为管理员',
      '移除成员'
    ];

    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.changeMemberRole(member);
        } else if (res.tapIndex === 1) {
          this.removeMember(member);
        }
      }
    });
  },

  async changeMemberRole(member) {
    const newRole = member.role === 'admin' ? 'member' : 'admin';

    wx.showLoading({
      title: '修改中...',
      mask: true
    });

    try {
      await DataManager.updateMemberRole(this.data.family.id, member.userId, newRole);
      wx.hideLoading();

      wx.showToast({
        title: '修改成功',
        icon: 'success'
      });

      // 重新加载成员列表
      this.loadMembers();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '修改失败',
        icon: 'none'
      });
    }
  },

  removeMember(member) {
    wx.showModal({
      title: '确认移除',
      content: `确定要移除成员"${member.nickname}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '移除中...',
            mask: true
          });

          try {
            await DataManager.removeMember(this.data.family.id, member.userId);
            wx.hideLoading();

            wx.showToast({
              title: '移除成功',
              icon: 'success'
            });

            // 重新加载成员列表
            this.loadMembers();
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '移除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onLeaveFamily() {
    wx.showModal({
      title: '确认退出',
      content: '退出后将无法访问该家庭的数据，确定要退出吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '退出中...',
            mask: true
          });

          try {
            await DataManager.leaveFamily(this.data.family.id);
            wx.hideLoading();

            wx.showToast({
              title: '已退出',
              icon: 'success'
            });

            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/family-select/family-select'
              });
            }, 1500);
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '退出失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onDeleteFamily() {
    // 调试：检查 DataManager.deleteFamily 是否存在
    console.log('DataManager:', DataManager);
    console.log('DataManager.deleteFamily:', DataManager.deleteFamily);
    console.log('typeof DataManager.deleteFamily:', typeof DataManager.deleteFamily);
    
    if (typeof DataManager.deleteFamily !== 'function') {
      wx.showToast({
        title: 'deleteFamily 方法不存在，请重新编译',
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '删除家庭后，所有成员将失去访问权限，家庭相关的药品、计划、记录等数据也将被删除，此操作不可恢复！',
      confirmText: '确认删除',
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...',
            mask: true
          });

          try {
            await DataManager.deleteFamily(this.data.family.id);
            wx.hideLoading();

            wx.showToast({
              title: '已删除',
              icon: 'success'
            });

            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/family-select/family-select'
              });
            }, 1500);
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onSwitchFamily() {
    wx.navigateTo({
      url: '/pages/family-select/family-select'
    });
  },

  // 修改家庭名称
  onEditFamilyName() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可操作',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '修改家庭名称',
      content: '',
      editable: true,
      placeholderText: '请输入新的家庭名称',
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newName = res.content.trim();
          
          if (newName === this.data.family.name) {
            return;
          }

          wx.showLoading({
            title: '修改中...',
            mask: true
          });

          try {
            await DataManager.updateFamily(this.data.family.id, { name: newName });
            wx.hideLoading();

            wx.showToast({
              title: '修改成功',
              icon: 'success'
            });

            // 更新本地数据
            const updatedFamily = { ...this.data.family, name: newName };
            this.setData({
              family: updatedFamily
            });

            // 更新缓存的家庭信息
            DataManager.setCurrentFamily(updatedFamily);
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '修改失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onBack() {
    wx.navigateBack({
      delta: 1
    });
  }
});
