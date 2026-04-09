const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const medicines = [
  {
    id: 1,
    name: '阿莫西林',
    manufacturer: '哈药集团',
    specification: '0.25g×24粒',
    category: '抗生素',
    stock: 2,
    unit: '盒',
    daysToExpiry: 180,
    dosage: '口服，一次1-2粒，一日3次',
    status: 'normal'
  },
  {
    id: 2,
    name: '布洛芬',
    manufacturer: '中美史克',
    specification: '0.3g×20片',
    category: '解热镇痛',
    stock: 1,
    unit: '盒',
    daysToExpiry: 30,
    dosage: '口服，一次1片，一日2次',
    status: 'expiring'
  },
  {
    id: 3,
    name: '感冒灵',
    manufacturer: '999药业',
    specification: '9g×10袋',
    category: '感冒药',
    stock: 3,
    unit: '盒',
    daysToExpiry: 365,
    dosage: '开水冲服，一次1袋，一日3次',
    status: 'normal'
  }
];

const plans = [
  {
    id: 1,
    medicineName: '阿莫西林',
    memberName: '妈妈',
    frequency: 'daily',
    timeSlots: ['08:00', '20:00'],
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-01-15'
  },
  {
    id: 2,
    medicineName: '布洛芬',
    memberName: '爸爸',
    frequency: 'daily',
    timeSlots: ['09:00', '21:00'],
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-01-10'
  },
  {
    id: 3,
    medicineName: '感冒灵',
    memberName: '爷爷',
    frequency: 'weekly',
    timeSlots: ['10:00'],
    status: 'ended',
    startDate: '2025-12-01',
    endDate: '2025-12-31'
  }
];

const familyMembers = [
  {
    id: 1,
    name: '妈妈',
    avatar: '',
    relation: 'mother',
    relationText: '母亲',
    phone: ''
  },
  {
    id: 2,
    name: '爸爸',
    avatar: '',
    relation: 'father',
    relationText: '父亲',
    phone: ''
  },
  {
    id: 3,
    name: '爷爷',
    avatar: '',
    relation: 'grandfather',
    relationText: '爷爷',
    phone: ''
  },
  {
    id: 4,
    name: '奶奶',
    avatar: '',
    relation: 'grandmother',
    relationText: '奶奶',
    phone: ''
  }
];

const records = [];

app.get('/api/medicine/list', (req, res) => {
  res.json({
    code: 200,
    data: medicines
  });
});

app.post('/api/medicine/add', (req, res) => {
  const newMedicine = {
    id: medicines.length + 1,
    ...req.body,
    status: req.body.daysToExpiry <= 30 ? 'expiring' : 'normal'
  };
  medicines.push(newMedicine);
  res.json({
    code: 200,
    data: newMedicine
  });
});

app.put('/api/medicine/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = medicines.findIndex(m => m.id === id);
  if (index !== -1) {
    medicines[index] = { ...medicines[index], ...req.body };
    res.json({
      code: 200,
      data: medicines[index]
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '药品不存在'
    });
  }
});

app.delete('/api/medicine/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = medicines.findIndex(m => m.id === id);
  if (index !== -1) {
    medicines.splice(index, 1);
    res.json({
      code: 200,
      message: '删除成功'
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '药品不存在'
    });
  }
});

app.get('/api/plan/list', (req, res) => {
  res.json({
    code: 200,
    data: plans
  });
});

app.post('/api/plan/create', (req, res) => {
  const newPlan = {
    id: plans.length + 1,
    ...req.body
  };
  plans.push(newPlan);
  res.json({
    code: 200,
    data: newPlan
  });
});

app.put('/api/plan/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = plans.findIndex(p => p.id === id);
  if (index !== -1) {
    plans[index] = { ...plans[index], ...req.body };
    res.json({
      code: 200,
      data: plans[index]
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '计划不存在'
    });
  }
});

app.delete('/api/plan/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = plans.findIndex(p => p.id === id);
  if (index !== -1) {
    plans.splice(index, 1);
    res.json({
      code: 200,
      message: '删除成功'
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '计划不存在'
    });
  }
});

app.get('/api/family/list', (req, res) => {
  res.json({
    code: 200,
    data: familyMembers
  });
});

app.post('/api/family/add', (req, res) => {
  const newMember = {
    id: familyMembers.length + 1,
    ...req.body
  };
  familyMembers.push(newMember);
  res.json({
    code: 200,
    data: newMember
  });
});

app.put('/api/family/update/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = familyMembers.findIndex(m => m.id === id);
  if (index !== -1) {
    familyMembers[index] = { ...familyMembers[index], ...req.body };
    res.json({
      code: 200,
      data: familyMembers[index]
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '成员不存在'
    });
  }
});

app.delete('/api/family/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = familyMembers.findIndex(m => m.id === id);
  if (index !== -1) {
    familyMembers.splice(index, 1);
    res.json({
      code: 200,
      message: '删除成功'
    });
  } else {
    res.status(404).json({
      code: 404,
      message: '成员不存在'
    });
  }
});

app.get('/api/user/info', (req, res) => {
  res.json({
    code: 200,
    data: {
      nickname: '用户',
      avatar: '',
      phone: ''
    }
  });
});

app.put('/api/user/info', (req, res) => {
  res.json({
    code: 200,
    message: '更新成功'
  });
});

app.get('/api/settings', (req, res) => {
  res.json({
    code: 200,
    data: {
      seniorMode: false,
      reminderEnabled: true,
      reminderTime: '08:00'
    }
  });
});

app.put('/api/settings', (req, res) => {
  res.json({
    code: 200,
    message: '保存成功'
  });
});

app.get('/api/statistics/overview', (req, res) => {
  res.json({
    code: 200,
    data: {
      medicineStats: {
        total: medicines.length,
        normal: 2,
        expiring: 1,
        expired: 0
      },
      planStats: {
        total: plans.length,
        active: 2,
        ended: 1
      },
      reminderStats: {
        today: 4,
        completed: 2,
        missed: 0,
        total: 100
      }
    }
  });
});

app.get('/api/records', (req, res) => {
  const { date } = req.query;
  const dateRecords = records.filter(r => r.date === date);
  res.json({
    code: 200,
    data: dateRecords
  });
});

app.listen(PORT, () => {
  console.log(`后端服务已启动：http://localhost:${PORT}`);
  console.log(`API地址：http://localhost:${PORT}/api`);
});
