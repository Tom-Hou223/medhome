const pool = require('../db');

/**
 * 检查用户是否属于指定家庭
 */
const checkFamilyAccess = async (req, res, next) => {
  try {
    const familyId = req.params.familyId || req.body.familyId || req.query.familyId;
    const userId = req.user.id;

    if (!familyId) {
      return res.status(400).json({
        code: 400,
        message: '缺少家庭ID'
      });
    }

    // 检查用户是否属于该家庭
    const [rows] = await pool.query(
      'SELECT role FROM family_user_roles WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    console.log('checkFamilyAccess - 查询结果:', rows);

    if (rows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '无权访问该家庭'
      });
    }

    // 将用户在该家庭的角色附加到请求对象
    req.familyRole = rows[0].role;
    req.familyId = parseInt(familyId);

    next();
  } catch (error) {
    console.error('家庭访问权限检查错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

/**
 * 检查用户是否为家庭管理员
 */
const checkFamilyAdmin = async (req, res, next) => {
  try {
    const familyId = req.params.familyId || req.body.familyId || req.query.familyId;
    const userId = req.user.id;

    if (!familyId) {
      return res.status(400).json({
        code: 400,
        message: '缺少家庭ID'
      });
    }

    // 检查用户是否为该家庭的管理员
    const [rows] = await pool.query(
      'SELECT role FROM family_user_roles WHERE family_id = ? AND user_id = ? AND role = ?',
      [familyId, userId, 'admin']
    );

    if (rows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    req.familyId = parseInt(familyId);
    req.familyRole = 'admin';

    next();
  } catch (error) {
    console.error('管理员权限检查错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取用户当前选择的家庭ID（从请求头或查询参数）
 */
const getCurrentFamilyId = (req) => {
  return req.headers['x-family-id'] || req.query.familyId || req.body.familyId;
};

/**
 * 检查用户对当前家庭的访问权限
 */
const checkCurrentFamilyAccess = async (req, res, next) => {
  try {
    const familyId = getCurrentFamilyId(req);
    const userId = req.user.id;

    if (!familyId) {
      // 没有选择家庭，允许继续访问，但不设置familyId
      next();
      return;
    }

    // 检查用户是否属于该家庭
    const [rows] = await pool.query(
      'SELECT role FROM family_user_roles WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '无权访问该家庭'
      });
    }

    req.familyRole = rows[0].role;
    req.familyId = parseInt(familyId);

    next();
  } catch (error) {
    console.error('当前家庭访问权限检查错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

/**
 * 检查用户对当前家庭的管理员权限
 */
const checkCurrentFamilyAdmin = async (req, res, next) => {
  try {
    const familyId = getCurrentFamilyId(req);
    const userId = req.user.id;

    if (!familyId) {
      // 没有选择家庭，允许继续访问，但不设置familyId
      next();
      return;
    }

    // 检查用户是否为该家庭的管理员
    const [rows] = await pool.query(
      'SELECT role FROM family_user_roles WHERE family_id = ? AND user_id = ? AND role = ?',
      [familyId, userId, 'admin']
    );

    if (rows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '需要管理员权限'
      });
    }

    req.familyId = parseInt(familyId);
    req.familyRole = 'admin';

    next();
  } catch (error) {
    console.error('当前家庭管理员权限检查错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  checkFamilyAccess,
  checkFamilyAdmin,
  checkCurrentFamilyAccess,
  checkCurrentFamilyAdmin,
  getCurrentFamilyId
};
