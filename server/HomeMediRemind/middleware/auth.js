const jwt = require('jsonwebtoken');

// 认证中间件
const auth = async (req, res, next) => {
  try {
    // 获取token
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({
        code: 401,
        message: '无访问令牌，拒绝访问'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 验证token，直接写死secret，和登录的一致！
    const decoded = jwt.verify(token, 'your-secret-key-123456');
    
    // 把用户信息挂载到req上
    req.user = {
      id: decoded.userId,
      openid: decoded.openid
    };
    
    next();
  } catch (error) {
    console.error('认证失败:', error);
    res.status(401).json({
      code: 401,
      message: '无效的认证令牌'
    });
  }
};

module.exports = auth;