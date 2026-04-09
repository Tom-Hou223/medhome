const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../db');

/**
 * 认证中间件
 * 验证JWT token并将用户信息附加到req.user
 */
const auth = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌'
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    // 验证token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          code: 401,
          message: '认证令牌已过期'
        });
      }
      return res.status(401).json({
        code: 401,
        message: '无效的认证令牌'
      });
    }

    // 从数据库获取用户信息
    const [users] = await pool.query(
      'SELECT id, openid, nickname, avatar_url FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在'
      });
    }

    // 将用户信息附加到请求对象
    req.user = {
      id: users[0].id,
      openid: users[0].openid,
      nickname: users[0].nickname,
      avatarUrl: users[0].avatar_url
    };

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

module.exports = auth;
