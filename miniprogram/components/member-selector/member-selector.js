Component({
  properties: {
    members: {
      type: Array,
      value: [],
      observer: function() {
        this.refreshMembers();
      }
    },
    selectedId: {
      type: null,
      value: null,
      observer: function() {
        this.refreshMembers();
        this.updateDisplayName();
        this.updateRoleTag();
      }
    },
    isAdmin: {
      type: Boolean,
      value: false
    },
    selectedRole: {
      type: String,
      value: '',
      observer: function() {
        this.updateRoleTag();
      }
    }
  },

  data: {
    showSelector: false,
    displayName: '',
    roleTagText: '成员',
    roleTagType: 'default',
    memberList: []
  },

  attached: function() {
    this.refreshMembers();
    this.updateDisplayName();
    this.updateRoleTag();
  },

  methods: {
    refreshMembers: function() {
      var members = this.properties.members;
      var selectedId = this.properties.selectedId;
      if (!members || members.length === 0) {
        this.setData({ memberList: [] });
        return;
      }
      var selId = selectedId != null ? String(selectedId) : '';
      var list = [];
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        list.push({
          id: m.id,
          name: m.name,
          role: m.role || 'member',
          isSelected: selId !== '' && String(m.id) === selId
        });
      }
      this.setData({ memberList: list });
    },

    updateDisplayName: function() {
      var members = this.properties.members || [];
      var selectedId = this.properties.selectedId;
      if (selectedId == null || selectedId === '') {
        var first = members[0];
        this.setData({ displayName: first ? first.name : '' });
      } else {
        var found = null;
        for (var i = 0; i < members.length; i++) {
          if (String(members[i].id) === String(selectedId)) {
            found = members[i];
            break;
          }
        }
        this.setData({ displayName: found ? found.name : '' });
      }
    },

    updateRoleTag: function() {
      var selectedId = this.properties.selectedId;
      var selectedRole = this.properties.selectedRole;
      var isAdmin = this.properties.isAdmin;
      if (selectedId == null || selectedId === '') {
        var members = this.properties.members || [];
        var first = members[0];
        var firstRole = first ? first.role : '';
        this.setData({
          roleTagText: firstRole === 'admin' ? '管理员' : '成员',
          roleTagType: firstRole === 'admin' ? 'success' : 'default'
        });
      } else {
        var isSelectedAdmin = selectedRole === 'admin';
        this.setData({
          roleTagText: isSelectedAdmin ? '管理员' : '成员',
          roleTagType: isSelectedAdmin ? 'success' : 'default'
        });
      }
    },

    onToggleSelector: function() {
      if (!this.properties.isAdmin) return;
      this.setData({ showSelector: !this.data.showSelector });
    },

    onCloseSelector: function() {
      this.setData({ showSelector: false });
    },

    onSelectMember: function(e) {
      var member = e.currentTarget.dataset.member;
      var memberList = this.data.memberList;
      for (var i = 0; i < memberList.length; i++) {
        memberList[i].isSelected = String(memberList[i].id) === String(member.id);
      }
      this.setData({
        displayName: member.name,
        showSelector: false,
        memberList: memberList
      });
      this.triggerEvent('change', { memberId: member.id, memberName: member.name });
    }
  }
});