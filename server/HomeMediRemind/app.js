const express = require('express');
const cors = require('cors');
const path = require('path');

try {
  console.log('Starting server...');
  const authRouter = require('./routes/auth');

  const familiesRouter = require('./routes/families');

  const medicineRouter = require('./routes/medicine');

  const planRouter = require('./routes/plan');

  const recordsRouter = require('./routes/records');

  const familyRouter = require('./routes/family');

  const notificationsRouter = require('./routes/notifications');

  const syncRouter = require('./routes/sync');

  // 加载定时任务调度器
  const Scheduler = require('./utils/scheduler');

  const app = express();
  const port = 3001;

  app.use(cors());
  app.use(express.json());

  // 静态文件服务 - 用于访问上传的头像
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // 认证路由（无需认证）
  app.use('/api/auth', authRouter);

  // 家庭管理路由（需要认证）
  app.use('/api/families', familiesRouter);

  // 业务路由（需要认证和家庭权限）
  app.use('/api/medicine', medicineRouter);
  app.use('/api/plan', planRouter);
  app.use('/api/records', recordsRouter);
  app.use('/api/family', familyRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/sync', syncRouter);

  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // 启动定时任务调度器
    Scheduler.init();
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

} catch (error) {
  console.error('Startup error:', error);
}