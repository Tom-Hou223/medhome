const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkCurrentFamilyAccess, checkCurrentFamilyAdmin } = require('../middleware/permission');

router.get('/list', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const familyId = req.familyId;

    // 如果没有选择家庭，返回空数据
    if (!familyId) {
      return res.json({
        code: 0,
        message: 'success',
        data: []
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM plans WHERE family_id = ? ORDER BY created_at DESC',
      [familyId]
    );
    
    // 转换数据库结果为前端需要的格式
    const plans = rows.map(row => {
      let timeSlots = [];
      
      // 如果 time_slots 已经是数组（MySQL JSON 类型自动解析），直接使用
      if (Array.isArray(row.time_slots)) {
        timeSlots = row.time_slots;
      } else if (typeof row.time_slots === 'string') {
        // 如果是字符串，尝试解析
        try {
          timeSlots = JSON.parse(row.time_slots);
        } catch (e) {
          console.warn(`无效的 time_slots JSON: ${row.time_slots}`);
          timeSlots = [];
        }
      }

      return {
        id: row.id,
        medicineName: row.medicine_name,
        memberName: row.member_name,
        frequency: row.frequency,
        timeSlots: timeSlots,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date
      };
    });
    
    res.json({
      code: 0,
      message: 'success',
      data: plans
    });
  } catch (error) {
    console.error('获取计划列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.post('/create', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { medicineName, memberName, frequency, timeSlots, startDate, endDate } = req.body;
    const familyId = req.familyId;
    const id = Date.now();

    // 确保 timeSlots 是数组
    let timeSlotsArray = timeSlots;
    if (!Array.isArray(timeSlots)) {
      timeSlotsArray = [];
    }

    await pool.query(
      'INSERT INTO plans (id, family_id, medicine_name, member_name, frequency, time_slots, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, familyId, medicineName, memberName, frequency, JSON.stringify(timeSlotsArray), 'active', startDate, endDate]
    );
    
    const newPlan = {
      id,
      medicineName,
      memberName,
      frequency,
      timeSlots: timeSlotsArray,
      status: 'active',
      startDate,
      endDate
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: newPlan
    });
  } catch (error) {
    console.error('创建计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.put('/update/:id', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { medicineName, memberName, frequency, timeSlots, status, startDate, endDate } = req.body;
    const familyId = req.familyId;

    // 确保 timeSlots 是数组
    let timeSlotsArray = timeSlots;
    if (!Array.isArray(timeSlots)) {
      timeSlotsArray = [];
    }

    const [result] = await pool.query(
      'UPDATE plans SET medicine_name = ?, member_name = ?, frequency = ?, time_slots = ?, status = ?, start_date = ?, end_date = ? WHERE id = ? AND family_id = ?',
      [medicineName, memberName, frequency, JSON.stringify(timeSlotsArray), status, startDate, endDate, id, familyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Plan not found'
      });
    }
    
    const updatedPlan = {
      id: parseInt(id),
      medicineName,
      memberName,
      frequency,
      timeSlots: timeSlotsArray,
      status,
      startDate,
      endDate
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: updatedPlan
    });
  } catch (error) {
    console.error('更新计划失败:', error);
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
      'DELETE FROM plans WHERE id = ? AND family_id = ?',
      [id, familyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Plan not found'
      });
    }
    
    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    console.error('删除计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;