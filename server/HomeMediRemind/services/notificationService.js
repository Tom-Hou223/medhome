const axios = require('axios');
const db = require('../db');
const config = require('../config');

class NotificationService {
  constructor() {
    this.accessToken = null;
    this.tokenExpireTime = null;
  }

  /**
   * 获取微信 access_token
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpireTime && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: config.wechat.appId,
          secret: config.wechat.appSecret
        }
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpireTime = Date.now() + (110 * 60 * 1000);
        console.log('✅ 获取微信 access_token 成功');
        return this.accessToken;
      } else {
        throw new Error(response.data.errmsg || '获取 access_token 失败');
      }
    } catch (error) {
      console.error('❌ 获取微信 access_token 失败:', error.message);
      throw error;
    }
  }

  /**
   * 发送订阅消息
   */
  async sendSubscribeMessage(openid, templateId, data, page = 'pages/index/index') {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

      const response = await axios.post(url, {
        touser: openid,
        template_id: templateId,
        page: page,
        data: data,
        miniprogram_state: 'developer'
      });

      if (response.data.errcode === 0) {
        console.log(`✅ 订阅消息发送成功: ${openid}`);
        return { success: true };
      } else {
        console.error(`❌ 订阅消息发送失败: ${response.data.errmsg}`);
        return { success: false, error: response.data.errmsg };
      }
    } catch (error) {
      console.error('❌ 发送订阅消息异常:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查并发送药品过期提醒
   */
  async checkAndSendExpiryNotifications() {
    try {
      console.log('开始检查药品过期状态...');

      // 获取所有用户的预警天数设置
      const [users] = await db.query(`
        SELECT DISTINCT u.id, u.openid, u.nickname, fur.family_id
        FROM users u
        JOIN family_user_roles fur ON u.id = fur.user_id
        WHERE u.openid IS NOT NULL
      `);

      for (const user of users) {
        // 获取用户的预警天数设置
        const [settings] = await db.query(`
          SELECT expiry_warning_days FROM user_notification_settings
          WHERE user_id = ?
        `, [user.id]);

        const warningDays = settings.length > 0 ? settings[0].expiry_warning_days : 30;

        // 查询该用户家庭中即将过期的药品
        const [medicines] = await db.query(`
          SELECT * FROM medicines
          WHERE family_id = ? AND days_to_expiry <= ? AND days_to_expiry >= 0
          AND status = 'normal'
        `, [user.family_id, warningDays]);

        if (medicines.length === 0) continue;

        // 检查用户是否订阅了过期提醒
        const [subscriptions] = await db.query(`
          SELECT * FROM user_subscriptions
          WHERE user_id = ? AND template_type = 'expiry' AND is_active = TRUE
        `, [user.id]);

        if (subscriptions.length === 0) continue;

        // 发送提醒
        for (const medicine of medicines) {
          const messageData = {
            thing1: { value: medicine.name.substring(0, 20) },
            date2: { value: this.formatDate(new Date(Date.now() + medicine.days_to_expiry * 24 * 60 * 60 * 1000)) },
            number3: { value: medicine.days_to_expiry.toString() },
            thing4: { value: '请及时使用或处理' }
          };

          await this.sendSubscribeMessage(
            user.openid,
            config.wechat.templates.expiry,
            messageData,
            'pages/medicine/medicine'
          );
        }
      }

      console.log('✅ 药品过期检查完成');
    } catch (error) {
      console.error('❌ 检查药品过期状态失败:', error.message);
    }
  }

  /**
   * 检查并发送用药提醒
   */
  async checkAndSendMedicationNotifications() {
    try {
      console.log('开始检查用药计划...');

      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const currentDate = new Date().toISOString().split('T')[0];

      // 获取所有活跃用户
      const [users] = await db.query(`
        SELECT DISTINCT u.id, u.openid, u.nickname, fur.family_id
        FROM users u
        JOIN family_user_roles fur ON u.id = fur.user_id
        WHERE u.openid IS NOT NULL
      `);

      for (const user of users) {
        // 获取用户的提醒时间设置
        const [settings] = await db.query(`
          SELECT reminder_time FROM user_notification_settings
          WHERE user_id = ?
        `, [user.id]);

        const reminderTime = settings.length > 0 ? settings[0].reminder_time : 15;

        // 查询该用户家庭的活跃用药计划
        const [plans] = await db.query(`
          SELECT * FROM plans
          WHERE family_id = ? AND status = 'active'
          AND (end_date IS NULL OR end_date >= ?)
        `, [user.family_id, currentDate]);

        for (const plan of plans) {
          let timeSlots = [];
          
          // 添加详细日志
          console.log('Plan ID:', plan.id);
          console.log('time_slots 类型:', typeof plan.time_slots);
          console.log('time_slots 值:', plan.time_slots);
          console.log('是否为数组:', Array.isArray(plan.time_slots));
          
          try {
            // 如果 time_slots 已经是数组（MySQL JSON 类型自动解析），直接使用
            if (Array.isArray(plan.time_slots)) {
              timeSlots = plan.time_slots;
              console.log('✅ 直接使用数组:', timeSlots);
            } else if (typeof plan.time_slots === 'string') {
              // 如果是字符串，尝试解析
              timeSlots = JSON.parse(plan.time_slots || '[]');
              console.log('✅ 解析字符串成功:', timeSlots);
            } else {
              console.log('⚠️ 未知类型，使用空数组');
              timeSlots = [];
            }
          } catch (e) {
            console.warn(`❌ 无效的 time_slots JSON: ${plan.time_slots}`);
            console.warn('错误详情:', e.message);
            continue;
          }

          for (const slot of timeSlots) {
            // 检查 slot 是否是时间格式 (HH:MM)
            if (!slot.includes(':')) {
              console.warn(`无效的时间格式: ${slot}`);
              continue;
            }

            const [slotHour, slotMinute] = slot.split(':').map(Number);
            if (isNaN(slotHour) || isNaN(slotMinute)) {
              console.warn(`无法解析时间: ${slot}`);
              continue;
            }

            const slotTime = slotHour * 60 + slotMinute;
            const currentTime = currentHour * 60 + currentMinute;
            const timeDiff = slotTime - currentTime;

            // 如果当前时间正好是提前提醒的时间
            if (timeDiff === reminderTime) {
              // 检查用户是否订阅了用药提醒
              const [subscriptions] = await db.query(`
                SELECT * FROM user_subscriptions
                WHERE user_id = ? AND template_type = 'medication' AND is_active = TRUE
              `, [user.id]);

              if (subscriptions.length > 0) {
                const messageData = {
                  thing1: { value: plan.medicine_name.substring(0, 20) },
                  time2: { value: slot },
                  thing3: { value: plan.member_name.substring(0, 20) },
                  thing4: { value: plan.frequency || '按时服用' }
                };

                await this.sendSubscribeMessage(
                  user.openid,
                  config.wechat.templates.medication,
                  messageData,
                  'pages/plan/plan'
                );
              }
            }
          }
        }
      }

      console.log('✅ 用药计划检查完成');
    } catch (error) {
      console.error('❌ 检查用药计划失败:', error.message);
    }
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = new NotificationService();
