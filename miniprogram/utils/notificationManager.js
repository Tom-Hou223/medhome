const DataManager = require('./dataManager.js');

class NotificationManager {
  constructor() {
    this.checkInterval = null;
  }

  static getInstance() {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 初始化通知管理器
   */
  init() {
    this.startLocalCheck();
  }

  /**
   * 启动本地检查（小程序内弹窗提醒）
   */
  startLocalCheck() {
    // 每分钟检查一次
    this.checkInterval = setInterval(() => {
      this.checkLocalNotifications();
    }, 60000);

    // 立即检查一次
    this.checkLocalNotifications();
  }

  /**
   * 停止本地检查
   */
  stopLocalCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查本地通知（小程序内弹窗）
   */
  async checkLocalNotifications() {
    try {
      const settings = wx.getStorageSync('reminderSettings') || {};
      // 确保转换为数字类型
      const reminderTime = parseInt(settings.reminderTime || settings.expiryWarningDays || 15);
      const warningDays = parseInt(settings.expiryWarningDays || 30);

      const currentDate = new Date();
      const currentHour = currentDate.getHours();
      const currentMinute = currentDate.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      // 检查用药提醒
      const plans = await DataManager.getPlans();
      if (plans.code === 0) {
        for (const plan of plans.data) {
          if (plan.status !== 'active') continue;

          const timeSlots = plan.timeSlots || [];
          for (const slot of timeSlots) {
            // 检查时间格式
            if (!slot.includes(':')) continue;
            
            const [slotHour, slotMinute] = slot.split(':').map(Number);
            if (isNaN(slotHour) || isNaN(slotMinute)) continue;

            const slotTime = slotHour * 60 + slotMinute;
            const timeDiff = slotTime - currentTime;

            // 如果在提醒时间范围内（提前reminderTime分钟到服药时间之间）
            if (timeDiff >= 0 && timeDiff <= reminderTime) {
              // 检查今天是否已经提醒过这个时间段
              const notifyKey = `medication_notify_${plan.id}_${slot}_${currentDate.toISOString().split('T')[0]}`;
              const hasNotified = wx.getStorageSync(notifyKey);
              
              if (!hasNotified) {
                this.showLocalNotification({
                  title: '用药提醒',
                  content: `${plan.memberName} 需要在 ${slot} 服用 ${plan.medicineName}`
                });
                wx.setStorageSync(notifyKey, true);
              }
            }
          }
        }
      }

      // 检查药品过期（每天8点检查）
      if (currentHour === 8 && currentMinute >= 0 && currentMinute < 5) {
        const medicines = await DataManager.getMedicines();
        if (medicines.code === 0) {
          for (const medicine of medicines.data) {
            if (medicine.days_to_expiry <= warningDays && medicine.days_to_expiry >= 0) {
              // 每天只提醒一次
              const lastNotifyDate = wx.getStorageSync(`expiry_notify_${medicine.id}`);
              const today = currentDate.toISOString().split('T')[0];
              
              if (lastNotifyDate !== today) {
                this.showLocalNotification({
                  title: '药品过期提醒',
                  content: `${medicine.name} 将在 ${medicine.days_to_expiry} 天后过期`
                });
                wx.setStorageSync(`expiry_notify_${medicine.id}`, today);
              }
               // 检查药品过期（改为每分钟检查，方便测试）
      // console.log('检查药品过期提醒，预警天数:', warningDays);
      // const medicines = await DataManager.getMedicines();
      // if (medicines.code === 0) {
      //   console.log('获取到药品数量:', medicines.data.length);
      //   for (const medicine of medicines.data) {
      //     console.log(`药品: ${medicine.name}, 剩余天数: ${medicine.daysToExpiry}`);
          
      //     if (medicine.daysToExpiry !== null && medicine.daysToExpiry !== undefined && 
      //         medicine.daysToExpiry <= warningDays && medicine.daysToExpiry >= 0) {
      //       // 每分钟只提醒一次（使用分钟级别的key）
      //       const notifyKey = `expiry_notify_${medicine.id}_${currentDate.toISOString().split('T')[0]}_${currentHour}_${currentMinute}`;
      //       const hasNotified = wx.getStorageSync(notifyKey);
            
      //       if (!hasNotified) {
      //         console.log('触发药品过期提醒:', medicine.name, '剩余天数:', medicine.daysToExpiry);
      //         this.showLocalNotification({
      //           title: '药品过期提醒',
      //           content: `${medicine.name} 将在 ${medicine.daysToExpiry} 天后过期`
      //         });
      //         wx.setStorageSync(notifyKey, true);
      //       } else {
      //         console.log('本分钟已提醒过:', notifyKey);
            }
          }
        }
      }
    } catch (error) {
      // 检查本地通知失败
    }
  }

  /**
   * 显示本地通知（小程序内弹窗）
   */
  showLocalNotification({ title, content }) {
    wx.showModal({
      title: title,
      content: content,
      showCancel: false,
      confirmText: '知道了'
    });
  }

  /**
   * 请求订阅消息权限
   */
  requestSubscribeMessage(templateType, callback) {
    DataManager.getSubscriptions().then(res => {
      if (res.code === 0) {
        const templateId = res.data.templates[templateType];
        
        wx.requestSubscribeMessage({
          tmplIds: [templateId],
          success: (result) => {
            if (result[templateId] === 'accept') {
              DataManager.subscribeNotification(templateType).then(() => {
                if (callback) callback(true);
              }).catch(() => {
                if (callback) callback(false);
              });
            } else {
              if (callback) callback(false);
            }
          },
          fail: () => {
            if (callback) callback(false);
          }
        });
      }
    });
  }
}

module.exports = NotificationManager;
