const cron = require('node-cron');
const notificationService = require('../services/notificationService');

class Scheduler {
  /**
   * 初始化定时任务
   */
  static init() {
    console.log('正在初始化定时任务调度器...');

    // 每天早上8:00检查药品过期
    cron.schedule(  '* * * * *', async () => {
      console.log('执行定时任务：检查药品过期');
      try {
        await notificationService.checkAndSendExpiryNotifications();
      } catch (error) {
        console.error('定时任务执行失败（药品过期检查）:', error.message);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });

    // 每分钟检查用药提醒
    cron.schedule('* * * * *', async () => {
      try {
        await notificationService.checkAndSendMedicationNotifications();
      } catch (error) {
        console.error('定时任务执行失败（用药提醒检查）:', error.message);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });

    console.log('✅ 定时任务调度器初始化完成');
    console.log('- 药品过期检查: 每天 08:00');
    console.log('- 用药提醒检查: 每分钟');
  }
}

module.exports = Scheduler;
