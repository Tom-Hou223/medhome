const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const config = require('../config');

/**
 * 订阅通知
 */
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { templateType } = req.body;
    const userId = req.user.id;

    if (!templateType || !['expiry', 'medication'].includes(templateType)) {
      return res.status(400).json({
        code: 400,
        message: '无效的模板类型'
      });
    }

    const templateId = config.wechat.templates[templateType];

    // 检查是否已订阅
    const [existing] = await db.query(`
      SELECT * FROM user_subscriptions
      WHERE user_id = ? AND template_type = ?
    `, [userId, templateType]);

    if (existing.length > 0) {
      await db.query(`
        UPDATE user_subscriptions
        SET is_active = TRUE, template_id = ?, subscribed_at = NOW()
        WHERE user_id = ? AND template_type = ?
      `, [templateId, userId, templateType]);
    } else {
      await db.query(`
        INSERT INTO user_subscriptions (user_id, template_id, template_type, is_active)
        VALUES (?, ?, ?, TRUE)
      `, [userId, templateId, templateType]);
    }

    res.json({
      code: 0,
      message: '订阅成功'
    });
  } catch (error) {
    console.error('订阅通知失败:', error);
    res.status(500).json({
      code: 500,
      message: '订阅失败: ' + error.message
    });
  }
});

/**
 * 取消订阅
 */
router.delete('/unsubscribe/:templateType', auth, async (req, res) => {
  try {
    const { templateType } = req.params;
    const userId = req.user.id;

    await db.query(`
      UPDATE user_subscriptions
      SET is_active = FALSE
      WHERE user_id = ? AND template_type = ?
    `, [userId, templateType]);

    res.json({
      code: 0,
      message: '取消订阅成功'
    });
  } catch (error) {
    console.error('取消订阅失败:', error);
    res.status(500).json({
      code: 500,
      message: '取消订阅失败: ' + error.message
    });
  }
});

/**
 * 获取订阅状态
 */
router.get('/subscriptions', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [subscriptions] = await db.query(`
      SELECT template_type, is_active, subscribed_at
      FROM user_subscriptions
      WHERE user_id = ?
    `, [userId]);

    res.json({
      code: 0,
      message: '获取订阅状态成功',
      data: {
        subscriptions,
        templates: config.wechat.templates
      }
    });
  } catch (error) {
    console.error('获取订阅状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取订阅状态失败: ' + error.message
    });
  }
});

/**
 * 保存用户提醒设置
 */
router.post('/settings', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reminderTime, expiryWarningDays } = req.body;

    // 检查是否已有设置
    const [existing] = await db.query(`
      SELECT * FROM user_notification_settings WHERE user_id = ?
    `, [userId]);

    if (existing.length > 0) {
      await db.query(`
        UPDATE user_notification_settings
        SET reminder_time = ?, expiry_warning_days = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [reminderTime, expiryWarningDays, userId]);
    } else {
      await db.query(`
        INSERT INTO user_notification_settings (user_id, reminder_time, expiry_warning_days)
        VALUES (?, ?, ?)
      `, [userId, reminderTime, expiryWarningDays]);
    }

    res.json({
      code: 0,
      message: '保存成功'
    });
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({
      code: 500,
      message: '保存设置失败: ' + error.message
    });
  }
});

/**
 * 获取用户提醒设置
 */
router.get('/settings', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [settings] = await db.query(`
      SELECT reminder_time, expiry_warning_days
      FROM user_notification_settings
      WHERE user_id = ?
    `, [userId]);

    res.json({
      code: 0,
      message: '获取设置成功',
      data: settings.length > 0 ? settings[0] : {
        reminder_time: 15,
        expiry_warning_days: 30
      }
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取设置失败: ' + error.message
    });
  }
});

module.exports = router;
