const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkCurrentFamilyAccess, checkCurrentFamilyAdmin } = require('../middleware/permission');

router.get('/', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const { date } = req.query;
    const familyId = req.familyId;

    // 如果没有选择家庭，返回空数据
    if (!familyId) {
      return res.json({
        code: 0,
        message: 'success',
        data: []
      });
    }

    let query = `
      SELECT r.* FROM records r
      INNER JOIN plans p ON r.plan_id = p.id
      WHERE p.family_id = ?
    `;
    const params = [familyId];

    if (date) {
      query += ' AND r.date = ?';
      params.push(date);
    }

    query += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(query, params);
    
    // 转换数据库结果为前端需要的格式
    const records = rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      medicineName: row.medicine_name,
      memberName: row.member_name,
      time: row.time,
      date: row.date,
      status: row.status,
      createdAt: row.created_at.toISOString()
    }));
    
    res.json({
      code: 0,
      message: 'success',
      data: records
    });
  } catch (error) {
    console.error('获取记录列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.post('/complete/:id', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.familyId;

    // 验证记录属于当前家庭
    const [checkRows] = await pool.query(
      `SELECT r.id FROM records r
       INNER JOIN plans p ON r.plan_id = p.id
       WHERE r.id = ? AND p.family_id = ?`,
      [id, familyId]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Record not found'
      });
    }

    const [result] = await pool.query(
      'UPDATE records SET status = ? WHERE id = ?',
      ['completed', id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Record not found'
      });
    }
    
    const [updatedRows] = await pool.query('SELECT * FROM records WHERE id = ?', [id]);
    const updatedRecord = {
      id: updatedRows[0].id,
      planId: updatedRows[0].plan_id,
      medicineName: updatedRows[0].medicine_name,
      memberName: updatedRows[0].member_name,
      time: updatedRows[0].time,
      date: updatedRows[0].date,
      status: updatedRows[0].status,
      createdAt: updatedRows[0].created_at.toISOString()
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: updatedRecord
    });
  } catch (error) {
    console.error('完成记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.post('/miss/:id', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.familyId;

    // 验证记录属于当前家庭
    const [checkRows] = await pool.query(
      `SELECT r.id FROM records r
       INNER JOIN plans p ON r.plan_id = p.id
       WHERE r.id = ? AND p.family_id = ?`,
      [id, familyId]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Record not found'
      });
    }

    const [result] = await pool.query(
      'UPDATE records SET status = ? WHERE id = ?',
      ['missed', id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Record not found'
      });
    }
    
    const [updatedRows] = await pool.query('SELECT * FROM records WHERE id = ?', [id]);
    const updatedRecord = {
      id: updatedRows[0].id,
      planId: updatedRows[0].plan_id,
      medicineName: updatedRows[0].medicine_name,
      memberName: updatedRows[0].member_name,
      time: updatedRows[0].time,
      date: updatedRows[0].date,
      status: updatedRows[0].status,
      createdAt: updatedRows[0].created_at.toISOString()
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: updatedRecord
    });
  } catch (error) {
    console.error('标记错过失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

// 添加记录的API
router.post('/add', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const { planId, medicineName, memberName, time, date } = req.body;
    const familyId = req.familyId;
    const id = Date.now();

    // 验证计划属于当前家庭
    const [plans] = await pool.query(
      'SELECT id FROM plans WHERE id = ? AND family_id = ?',
      [planId, familyId]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Plan not found'
      });
    }

    await pool.query(
      'INSERT INTO records (id, plan_id, medicine_name, member_name, time, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, planId, medicineName, memberName, time, date, 'pending']
    );
    
    const newRecord = {
      id,
      planId,
      medicineName,
      memberName,
      time,
      date,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: newRecord
    });
  } catch (error) {
    console.error('添加记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;