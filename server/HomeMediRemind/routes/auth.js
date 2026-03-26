const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const auth = require('../middleware/auth');

// 配置 multer 用于头像上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 使用用户ID和时间戳作为文件名
    const userId = req.user.id;
    const ext = path.extname(file.originalname);
    const filename = `avatar_${userId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制 5MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片格式
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * 微信登录
 * POST /api/auth/login
 * Body: { code: string }
 */
router.post('/login', async (req, res) => {
  try {
    const { code, userInfo } = req.body;

    if (!code) {
      return res.status(400).json({
        code: 400,
        message: '缺少登录凭证'
      });
    }

    // 调用微信接口获取openid
    // 文档: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
    const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: 'wxbc0b79deb7269cfe',
        secret: '你的微信appsecret',
        js_code: code,
        grant_type: 'authorization_code'
      }
    });

    if (wxResponse.data.errcode) {
      return res.status(400).json({
        code: 400,
        message: '微信登录失败: ' + (wxResponse.data.errmsg || '未知错误')
      });
    }

    const { openid, session_key } = wxResponse.data;

    // 查找或创建用户
    let [users] = await pool.query('SELECT * FROM users WHERE openid = ?', [openid]);

    let userId;
    if (users.length === 0) {
      // 新用户，创建记录
      userId = Date.now();
      const nickname = userInfo ? userInfo.nickName : '微信用户';
      const avatarUrl = userInfo ? userInfo.avatarUrl : null;
      await pool.query(
        'INSERT INTO users (id, openid, nickname, avatar_url) VALUES (?, ?, ?, ?)',
        [userId, openid, nickname, avatarUrl]
      );
    } else {
      userId = users[0].id;
      // 如果有用户信息，更新用户资料
      if (userInfo) {
        await pool.query(
          'UPDATE users SET nickname = ?, avatar_url = ? WHERE id = ?',
          [userInfo.nickName, userInfo.avatarUrl, userId]
        );
      }
    }

    // 生成JWT token，直接写死secret
    const token = jwt.sign(
      { userId, openid },
      'your-secret-key-123456',
      { expiresIn: '7d' }
    );

    // 检查用户是否属于任何家庭
    const [families] = await pool.query(
      `SELECT f.id, f.name, fur.role
       FROM families f
       INNER JOIN family_user_roles fur ON f.id = fur.family_id
       WHERE fur.user_id = ?`,
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        token,
        userId,
        openid,
        hasFamily: families.length > 0,
        families: families.map(f => ({
          id: f.id,
          name: f.name,
          role: f.role
        }))
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

const maskPhoneAsNickname = (phone) => {
  if (!phone || phone.length < 11) return phone || '';
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
};

router.post('/login-by-phone', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone) {
      return res.status(400).json({
        code: 400,
        message: '请输入手机号'
      });
    }

    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        code: 400,
        message: '手机号格式不正确'
      });
    }

    let isNewUser = false;
    let [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);

    let userId;
    let openid;
    if (users.length === 0) {
      isNewUser = true;
      userId = Date.now();
      openid = `phone_${phone}`;
      const nickname = maskPhoneAsNickname(phone);
      
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }

      await pool.query(
        'INSERT INTO users (id, openid, phone, password, nickname) VALUES (?, ?, ?, ?, ?)',
        [userId, openid, phone, hashedPassword, nickname]
      );
    } else {
      const user = users[0];
      userId = user.id;
      openid = user.openid;

      // 验证密码
      if (user.password && password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            code: 401,
            message: '密码错误'
          });
        }
      } else if (user.password && !password) {
        return res.status(401).json({
          code: 401,
          message: '请输入密码'
        });
      }

      if (!user.nickname) {
        const nickname = maskPhoneAsNickname(phone);
        await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, userId]);
      }
    }

    // 生成JWT token，直接写死secret
    const token = jwt.sign(
      { userId, openid },
      'your-secret-key-123456',
      { expiresIn: '7d' }
    );

    const [families] = await pool.query(
      `SELECT f.id, f.name, fur.role
       FROM families f
       INNER JOIN family_user_roles fur ON f.id = fur.family_id
       WHERE fur.user_id = ?`,
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        token,
        userId,
        openid,
        isNewUser,
        hasFamily: families.length > 0,
        families: families.map(f => ({
          id: f.id,
          name: f.name,
          role: f.role
        }))
      }
    });
  } catch (error) {
    console.error('手机号登录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 昵称登录
 * POST /api/auth/login-by-nickname
 * Body: { nickname: string, password: string }
 */
router.post('/login-by-nickname', async (req, res) => {
  try {
    const { nickname, password } = req.body;

    if (!nickname) {
      return res.status(400).json({
        code: 400,
        message: '请输入昵称'
      });
    }

    if (nickname.length < 2 || nickname.length > 20) {
      return res.status(400).json({
        code: 400,
        message: '昵称长度应在2-20个字符之间'
      });
    }

    let [users] = await pool.query('SELECT * FROM users WHERE nickname = ?', [nickname]);

    if (users.length === 0) {
      return res.status(401).json({
        code: 401,
        message: '昵称不存在'
      });
    }

    const user = users[0];
    const userId = user.id;
    const openid = user.openid;

    // 验证密码
    if (user.password && password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          code: 401,
          message: '密码错误'
        });
      }
    } else if (user.password && !password) {
      return res.status(401).json({
        code: 401,
        message: '请输入密码'
      });
    }

    const token = jwt.sign(
      { userId, openid },
      'your-secret-key-123456',
      { expiresIn: '7d' }
    );

    const [families] = await pool.query(
      `SELECT f.id, f.name, fur.role
       FROM families f
       INNER JOIN family_user_roles fur ON f.id = fur.id
       WHERE fur.user_id = ?`,
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        token,
        userId,
        openid,
        hasFamily: families.length > 0,
        families: families.map(f => ({
          id: f.id,
          name: f.name,
          role: f.role
        }))
      }
    });
  } catch (error) {
    console.error('昵称登录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/profile
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      'SELECT id, openid, nickname, avatar_url, phone, create_time FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    const user = users[0];

    // 获取用户的家庭列表
    const [families] = await pool.query(
      `SELECT f.id, f.name, fur.role
       FROM families f
       INNER JOIN family_user_roles fur ON f.id = fur.family_id
       WHERE fur.user_id = ?
       ORDER BY create_time DESC`,
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        createdAt: user.create_time,
        families: families.map(f => ({
          id: f.id,
          name: f.name,
          role: f.role
        }))
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新用户信息
 * PUT /api/auth/profile
 * Body: { nickname?: string, avatarUrl?: string, phone?: string }
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nickname, avatarUrl, phone } = req.body;

    const updates = [];
    const values = [];

    if (nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(nickname);
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    if (phone !== undefined) {
      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({
          code: 400,
          message: '手机号格式不正确'
        });
      }

      // 检查手机号是否已被其他用户使用
      if (phone) {
        const [existing] = await pool.query(
          'SELECT id FROM users WHERE phone = ? AND id != ?',
          [phone, userId]
        );

        if (existing.length > 0) {
          return res.status(400).json({
            code: 400,
            message: '该手机号已被其他用户使用'
          });
        }
      }

      updates.push('phone = ?');
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有要更新的字段'
      });
    }

    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // 获取更新后的用户信息
    const [users] = await pool.query(
      'SELECT id, openid, nickname, avatar_url, phone FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: users[0].id,
        openid: users[0].openid,
        nickname: users[0].nickname,
        avatarUrl: users[0].avatar_url,
        phone: users[0].phone
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 上传头像
 * POST /api/auth/upload-avatar
 */
router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请选择要上传的图片'
      });
    }

    const userId = req.user.id;
    const filename = req.file.filename;
    const avatarUrl = `/uploads/avatars/${filename}`;

    // 删除旧头像文件（如果存在）
    const [users] = await pool.query('SELECT avatar_url FROM users WHERE id = ?', [userId]);
    if (users.length > 0 && users[0].avatar_url) {
      const oldAvatarPath = path.join(__dirname, '..', users[0].avatar_url);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
        } catch (err) {
          console.error('删除旧头像失败:', err);
        }
      }
    }

    // 更新数据库中的头像路径
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId]);

    res.json({
      code: 0,
      message: 'success',
      data: {
        avatarUrl: avatarUrl,
        filename: filename
      }
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    res.status(500).json({
      code: 500,
      message: error.message || '上传头像失败'
    });
  }
});

module.exports = router;