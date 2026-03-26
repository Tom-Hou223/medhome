const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkCurrentFamilyAccess, checkCurrentFamilyAdmin } = require('../middleware/permission');

router.get('/list', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const familyId = req.familyId;

    const [rows] = await pool.query(
      'SELECT * FROM family_members WHERE family_id = ? ORDER BY created_at DESC',
      [familyId]
    );
    
    // 转换数据库结果为前端需要的格式
    const members = rows.map(row => ({
      id: row.id,
      name: row.name,
      relationship: row.relationship,
      age: row.age,
      createdAt: row.created_at.toISOString()
    }));
    
    res.json({
      code: 0,
      message: 'success',
      data: members
    });
  } catch (error) {
    console.error('获取家庭成员列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.post('/add', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { name, relationship, age } = req.body;
    const familyId = req.familyId;
    const id = Date.now();

    await pool.query(
      'INSERT INTO family_members (id, family_id, name, relationship, age) VALUES (?, ?, ?, ?, ?)',
      [id, familyId, name, relationship, age]
    );
    
    const newMember = {
      id,
      name,
      relationship,
      age,
      createdAt: new Date().toISOString()
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: newMember
    });
  } catch (error) {
    console.error('添加家庭成员失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.put('/update/:id', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, relationship, age } = req.body;
    const familyId = req.familyId;

    const [result] = await pool.query(
      'UPDATE family_members SET name = ?, relationship = ?, age = ? WHERE id = ? AND family_id = ?',
      [name, relationship, age, id, familyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Member not found'
      });
    }
    
    const updatedMember = {
      id: parseInt(id),
      name,
      relationship,
      age
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: updatedMember
    });
  } catch (error) {
    console.error('更新家庭成员失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.delete('/delete/:id', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.familyId;

    const [result] = await pool.query(
      'DELETE FROM family_members WHERE id = ? AND family_id = ?',
      [id, familyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Member not found'
      });
    }
    
    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    console.error('删除家庭成员失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;