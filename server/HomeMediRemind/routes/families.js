const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkFamilyAccess, checkFamilyAdmin } = require('../middleware/permission');

/**
 * 生成随机邀请码
 */
function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 创建家庭组
 * POST /api/families/create
 * Body: { name: string }
 */
router.post('/create', auth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '家庭名称不能为空'
      });
    }

    await connection.beginTransaction();

    // 创建家庭
    const familyId = Date.now();
    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await connection.query(
      'INSERT INTO families (id, name, creator_id, invite_code, invite_code_expires_at) VALUES (?, ?, ?, ?, ?)',
      [familyId, name.trim(), userId, inviteCode, expiresAt]
    );

    // 将创建者添加为管理员，关系设置为"本人"
    const roleId = Date.now() + 1;
    await connection.query(
      'INSERT INTO family_user_roles (id, family_id, user_id, role, relationship) VALUES (?, ?, ?, ?, ?)',
      [roleId, familyId, userId, 'admin', 'self']
    );

    await connection.commit();

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: familyId,
        name: name.trim(),
        creatorId: userId,
        inviteCode,
        inviteCodeExpiresAt: expiresAt,
        role: 'admin'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('创建家庭失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  } finally {
    connection.release();
  }
});

/**
 * 获取我的家庭列表
 * GET /api/families/my
 */
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [families] = await pool.query(
      `SELECT f.id, f.name, f.creator_id, f.created_at, fur.role, fur.joined_at,
              (SELECT COUNT(*) FROM family_user_roles WHERE family_id = f.id) as member_count
       FROM families f
       INNER JOIN family_user_roles fur ON f.id = fur.family_id
       WHERE fur.user_id = ?
       ORDER BY fur.joined_at DESC`,
      [userId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: families.map(f => ({
        id: f.id,
        name: f.name,
        creatorId: f.creator_id,
        role: f.role,
        memberCount: f.member_count,
        joinedAt: f.joined_at,
        createdAt: f.created_at
      }))
    });
  } catch (error) {
    console.error('获取家庭列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取关系规则列表
 * GET /api/families/relationship-rules
 * 注意：必须放在 /:familyId 路由之前，否则会被当作 familyId 参数
 */
router.get('/relationship-rules', auth, async (req, res) => {
  try {
    const [rules] = await pool.query(
      'SELECT relationship, max_count, description FROM family_relationship_rules ORDER BY id'
    );

    res.json({
      code: 0,
      message: 'success',
      data: rules
    });
  } catch (error) {
    console.error('获取关系规则失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取家庭详情
 * GET /api/families/:familyId
 */
router.get('/:familyId', auth, checkFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;

    const [families] = await pool.query(
      `SELECT f.*, u.nickname as creator_nickname
       FROM families f
       LEFT JOIN users u ON f.creator_id = u.id
       WHERE f.id = ?`,
      [familyId]
    );

    if (families.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '家庭不存在'
      });
    }

    const family = families[0];

    // 获取成员数量
    const [memberCount] = await pool.query(
      'SELECT COUNT(*) as count FROM family_user_roles WHERE family_id = ?',
      [familyId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: family.id,
        name: family.name,
        creatorId: family.creator_id,
        creatorNickname: family.creator_nickname,
        inviteCode: req.familyRole === 'admin' ? family.invite_code : null,
        inviteCodeExpiresAt: req.familyRole === 'admin' ? family.invite_code_expires_at : null,
        memberCount: memberCount[0].count,
        createdAt: family.created_at,
        myRole: req.familyRole
      }
    });
  } catch (error) {
    console.error('获取家庭详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新家庭信息
 * PUT /api/families/:familyId
 * Body: { name: string }
 */
router.put('/:familyId', auth, checkFamilyAdmin, async (req, res) => {
  try {
    const { familyId } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '家庭名称不能为空'
      });
    }

    await pool.query(
      'UPDATE families SET name = ? WHERE id = ?',
      [name.trim(), familyId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: parseInt(familyId),
        name: name.trim()
      }
    });
  } catch (error) {
    console.error('更新家庭信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除家庭（仅创建者可删除）
 * DELETE /api/families/:familyId
 */
router.delete('/:familyId', auth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { familyId } = req.params;
    const userId = req.user.id;

    await connection.beginTransaction();

    // 检查是否为创建者
    const [families] = await connection.query(
      'SELECT creator_id FROM families WHERE id = ?',
      [familyId]
    );

    if (families.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: 404,
        message: '家庭不存在'
      });
    }

    if (families[0].creator_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        code: 403,
        message: '只有创建者可以删除家庭'
      });
    }

    // 删除家庭相关的所有数据
    // 1. 删除用药记录
    await connection.query('DELETE FROM records WHERE family_id = ?', [familyId]);
    
    // 2. 删除用药计划
    await connection.query('DELETE FROM plans WHERE family_id = ?', [familyId]);
    
    // 3. 删除药品库存
    await connection.query('DELETE FROM medicines WHERE family_id = ?', [familyId]);
    
    // 4. 删除家庭成员信息（如果有单独的成员表）
    await connection.query('DELETE FROM family_members WHERE family_id = ?', [familyId]);
    
    // 5. 删除家庭用户角色关系
    await connection.query('DELETE FROM family_user_roles WHERE family_id = ?', [familyId]);
    
    // 6. 最后删除家庭本身
    await connection.query('DELETE FROM families WHERE id = ?', [familyId]);

    await connection.commit();

    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    await connection.rollback();
    console.error('删除家庭失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  } finally {
    connection.release();
  }
});

/**
 * 生成新的邀请码
 * POST /api/families/:familyId/invite
 */
router.post('/:familyId/invite', auth, checkFamilyAdmin, async (req, res) => {
  try {
    const { familyId } = req.params;

    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.query(
      'UPDATE families SET invite_code = ?, invite_code_expires_at = ? WHERE id = ?',
      [inviteCode, expiresAt, familyId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        inviteCode,
        expiresAt
      }
    });
  } catch (error) {
    console.error('生成邀请码失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 通过邀请码加入家庭
 * POST /api/families/join
 * Body: { inviteCode: string }
 */
router.post('/join', auth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({
        code: 400,
        message: '请输入邀请码'
      });
    }

    // 查找家庭
    const [families] = await connection.query(
      'SELECT id, name, invite_code_expires_at FROM families WHERE invite_code = ?',
      [inviteCode.toUpperCase()]
    );

    if (families.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '邀请码无效'
      });
    }

    const family = families[0];

    // 检查邀请码是否过期
    if (new Date() > new Date(family.invite_code_expires_at)) {
      return res.status(400).json({
        code: 400,
        message: '邀请码已过期'
      });
    }

    // 检查是否已经是成员
    const [existing] = await connection.query(
      'SELECT id FROM family_user_roles WHERE family_id = ? AND user_id = ?',
      [family.id, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '您已经是该家庭的成员'
      });
    }

    await connection.beginTransaction();

    // 添加为普通成员，默认关系为"其他"
    const roleId = Date.now();
    await connection.query(
      'INSERT INTO family_user_roles (id, family_id, user_id, role, relationship) VALUES (?, ?, ?, ?, ?)',
      [roleId, family.id, userId, 'member', 'other']
    );

    await connection.commit();

    res.json({
      code: 0,
      message: 'success',
      data: {
        familyId: family.id,
        familyName: family.name,
        role: 'member'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('加入家庭失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  } finally {
    connection.release();
  }
});

/**
 * 获取家庭成员列表
 * GET /api/families/:familyId/members
 */
router.get('/:familyId/members', auth, checkFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;

    const [members] = await pool.query(
      `SELECT fur.user_id, fur.role, fur.relationship, fur.joined_at, u.nickname, u.avatar_url, u.phone
       FROM family_user_roles fur
       LEFT JOIN users u ON fur.user_id = u.id
       WHERE fur.family_id = ?
       ORDER BY fur.role DESC, fur.joined_at ASC`,
      [familyId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: members.map(m => ({
        userId: m.user_id,
        nickname: m.nickname || '未设置昵称',
        avatarUrl: m.avatar_url,
        phone: m.phone,
        role: m.role,
        relationship: m.relationship || '成员',
        joinedAt: m.joined_at
      }))
    });
  } catch (error) {
    console.error('获取成员列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 修改成员角色
 * PUT /api/families/:familyId/members/:userId/role
 * Body: { role: 'admin' | 'member' }
 */
router.put('/:familyId/members/:userId/role', auth, checkFamilyAdmin, async (req, res) => {
  try {
    const { familyId, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({
        code: 400,
        message: '无效的角色'
      });
    }

    // 不能修改创建者的角色
    const [families] = await pool.query(
      'SELECT creator_id FROM families WHERE id = ?',
      [familyId]
    );

    if (families.length > 0 && families[0].creator_id === parseInt(userId)) {
      return res.status(400).json({
        code: 400,
        message: '不能修改创建者的角色'
      });
    }

    const [result] = await pool.query(
      'UPDATE family_user_roles SET role = ? WHERE family_id = ? AND user_id = ?',
      [role, familyId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '成员不存在'
      });
    }

    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    console.error('修改成员角色失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 移除成员
 * DELETE /api/families/:familyId/members/:userId
 */
router.delete('/:familyId/members/:userId', auth, checkFamilyAdmin, async (req, res) => {
  try {
    const { familyId, userId } = req.params;

    // 不能移除创建者
    const [families] = await pool.query(
      'SELECT creator_id FROM families WHERE id = ?',
      [familyId]
    );

    if (families.length > 0 && families[0].creator_id === parseInt(userId)) {
      return res.status(400).json({
        code: 400,
        message: '不能移除创建者'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM family_user_roles WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '成员不存在'
      });
    }

    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    console.error('移除成员失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 退出家庭
 * POST /api/families/:familyId/leave
 */
router.post('/:familyId/leave', auth, checkFamilyAccess, async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;

    // 创建者不能退出，只能删除家庭
    const [families] = await pool.query(
      'SELECT creator_id FROM families WHERE id = ?',
      [familyId]
    );

    if (families.length > 0 && families[0].creator_id === userId) {
      return res.status(400).json({
        code: 400,
        message: '创建者不能退出家庭，请删除家庭或转让创建者身份'
      });
    }

    await pool.query(
      'DELETE FROM family_user_roles WHERE family_id = ? AND user_id = ?',
      [familyId, userId]
    );

    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    console.error('退出家庭失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 通过手机号添加家庭成员
 * POST /api/families/:familyId/members/add-by-phone
 * Body: { phone: string, relationship: string }
 */
router.post('/:familyId/members/add-by-phone', auth, checkFamilyAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { familyId } = req.params;
    const { phone, relationship } = req.body;

    if (!phone || !relationship) {
      return res.status(400).json({
        code: 400,
        message: '手机号和关系不能为空'
      });
    }

    await connection.beginTransaction();

    // 查找用户
    const [users] = await connection.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: 404,
        message: '该手机号对应的用户尚未注册'
      });
    }

    const targetUserId = users[0].id;

    // 检查是否已经是成员
    const [existing] = await connection.query(
      'SELECT id FROM family_user_roles WHERE family_id = ? AND user_id = ?',
      [familyId, targetUserId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        code: 400,
        message: '该用户已经是家庭成员'
      });
    }

    // 检查关系规则
    const [rules] = await connection.query(
      'SELECT max_count FROM family_relationship_rules WHERE relationship = ?',
      [relationship]
    );

    if (rules.length > 0 && rules[0].max_count !== null) {
      const [count] = await connection.query(
        'SELECT COUNT(*) as count FROM family_user_roles WHERE family_id = ? AND relationship = ?',
        [familyId, relationship]
      );

      if (count[0].count >= rules[0].max_count) {
        await connection.rollback();
        return res.status(400).json({
          code: 400,
          message: `该家庭中"${relationship}"关系已达上限`
        });
      }
    }

    // 添加成员
    const roleId = Date.now();
    await connection.query(
      'INSERT INTO family_user_roles (id, family_id, user_id, role, relationship) VALUES (?, ?, ?, ?, ?)',
      [roleId, familyId, targetUserId, 'member', relationship]
    );

    await connection.commit();

    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    await connection.rollback();
    console.error('添加家庭成员失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  } finally {
    connection.release();
  }
});

/**
 * 更新成员关系
 * PUT /api/families/:familyId/members/:userId/relationship
 * Body: { relationship: string }
 */
router.put('/:familyId/members/:userId/relationship', auth, checkFamilyAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { familyId, userId } = req.params;
    const { relationship } = req.body;

    if (!relationship) {
      return res.status(400).json({
        code: 400,
        message: '关系不能为空'
      });
    }

    await connection.beginTransaction();

    // 检查关系规则
    const [rules] = await connection.query(
      'SELECT max_count FROM family_relationship_rules WHERE relationship = ?',
      [relationship]
    );

    if (rules.length > 0 && rules[0].max_count !== null) {
      // 检查该关系在家庭中的数量（排除当前用户）
      const [count] = await connection.query(
        'SELECT COUNT(*) as count FROM family_user_roles WHERE family_id = ? AND relationship = ? AND user_id != ?',
        [familyId, relationship, userId]
      );

      if (count[0].count >= rules[0].max_count) {
        await connection.rollback();
        return res.status(400).json({
          code: 400,
          message: `该家庭中"${relationship}"关系已达上限`
        });
      }
    }

    const [result] = await connection.query(
      'UPDATE family_user_roles SET relationship = ? WHERE family_id = ? AND user_id = ?',
      [relationship, familyId, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: 404,
        message: '成员不存在'
      });
    }

    await connection.commit();

    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    await connection.rollback();
    console.error('更新成员关系失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
