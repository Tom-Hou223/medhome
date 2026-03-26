const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkCurrentFamilyAccess } = require('../middleware/permission');

/**
 * 获取数据变更日志（用于增量同步）
 * GET /api/sync/changes
 * Query: lastSyncTime (ISO 8601 格式)
 */
router.get('/changes', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const familyId = req.familyId;
    const { lastSyncTime } = req.query;

    // 如果没有提供 lastSyncTime，返回最近1小时的变更
    const syncTime = lastSyncTime 
      ? new Date(lastSyncTime) 
      : new Date(Date.now() - 60 * 60 * 1000);

    // 获取变更日志
    const [changes] = await pool.query(
      `SELECT id, table_name, record_id, action, changed_at
       FROM data_change_logs
       WHERE family_id = ? AND changed_at > ?
       ORDER BY changed_at ASC`,
      [familyId, syncTime]
    );

    // 根据变更日志获取实际数据
    const syncData = {
      medicines: [],
      plans: [],
      familyMembers: [],
      deletedIds: {
        medicines: [],
        plans: [],
        familyMembers: []
      },
      serverTime: new Date().toISOString()
    };

    // 收集需要查询的ID
    const medicineIds = new Set();
    const planIds = new Set();
    const memberIds = new Set();

    for (const change of changes) {
      if (change.action === 'delete') {
        // 记录删除的ID
        if (change.table_name === 'medicines') {
          syncData.deletedIds.medicines.push(change.record_id);
        } else if (change.table_name === 'plans') {
          syncData.deletedIds.plans.push(change.record_id);
        } else if (change.table_name === 'family_members') {
          syncData.deletedIds.familyMembers.push(change.record_id);
        }
      } else {
        // 记录需要查询的ID
        if (change.table_name === 'medicines') {
          medicineIds.add(change.record_id);
        } else if (change.table_name === 'plans') {
          planIds.add(change.record_id);
        } else if (change.table_name === 'family_members') {
          memberIds.add(change.record_id);
        }
      }
    }

    // 查询药品数据
    if (medicineIds.size > 0) {
      const [medicines] = await pool.query(
        `SELECT 
          id, name, manufacturer, specification, category, stock, unit,
          DATEDIFF(expiry_date, CURDATE()) as days_to_expiry,
          expiry_date, dosage, created_at,
          CASE 
            WHEN expiry_date IS NULL THEN 'normal'
            WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 'expired'
            WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'expiring'
            ELSE 'normal'
          END as status
        FROM medicines 
        WHERE family_id = ? AND id IN (?)`,
        [familyId, Array.from(medicineIds)]
      );

      syncData.medicines = medicines.map(row => ({
        id: row.id,
        name: row.name,
        manufacturer: row.manufacturer,
        specification: row.specification,
        category: row.category,
        stock: row.stock,
        unit: row.unit,
        daysToExpiry: row.days_to_expiry,
        expiryDate: row.expiry_date ? row.expiry_date.toISOString().split('T')[0] : null,
        dosage: row.dosage,
        status: row.status,
        createdAt: row.created_at.toISOString()
      }));
    }

    // 查询计划数据
    if (planIds.size > 0) {
      const [plans] = await pool.query(
        'SELECT * FROM plans WHERE family_id = ? AND id IN (?)',
        [familyId, Array.from(planIds)]
      );

      syncData.plans = plans.map(row => ({
        id: row.id,
        medicineName: row.medicine_name,
        memberName: row.member_name,
        frequency: row.frequency,
        timeSlots: Array.isArray(row.time_slots) ? row.time_slots : JSON.parse(row.time_slots || '[]'),
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: row.created_at.toISOString()
      }));
    }

    // 查询家庭成员数据
    if (memberIds.size > 0) {
      const [members] = await pool.query(
        'SELECT * FROM family_members WHERE family_id = ? AND id IN (?)',
        [familyId, Array.from(memberIds)]
      );

      syncData.familyMembers = members.map(row => ({
        id: row.id,
        name: row.name,
        relationship: row.relationship,
        age: row.age,
        createdAt: row.created_at.toISOString()
      }));
    }

    res.json({
      code: 0,
      message: 'success',
      data: syncData
    });
  } catch (error) {
    console.error('获取同步数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取完整数据（全量同步）
 * GET /api/sync/full
 */
router.get('/full', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const familyId = req.familyId;

    // 获取所有药品
    const [medicines] = await pool.query(
      `SELECT 
        id, name, manufacturer, specification, category, stock, unit,
        DATEDIFF(expiry_date, CURDATE()) as days_to_expiry,
        expiry_date, dosage, created_at,
        CASE 
          WHEN expiry_date IS NULL THEN 'normal'
          WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 'expired'
          WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'expiring'
          ELSE 'normal'
        END as status
      FROM medicines 
      WHERE family_id = ?
      ORDER BY created_at DESC`,
      [familyId]
    );

    // 获取所有计划
    const [plans] = await pool.query(
      'SELECT * FROM plans WHERE family_id = ? ORDER BY created_at DESC',
      [familyId]
    );

    // 获取所有家庭成员
    const [members] = await pool.query(
      'SELECT * FROM family_members WHERE family_id = ? ORDER BY created_at DESC',
      [familyId]
    );

    res.json({
      code: 0,
      message: 'success',
      data: {
        medicines: medicines.map(row => ({
          id: row.id,
          name: row.name,
          manufacturer: row.manufacturer,
          specification: row.specification,
          category: row.category,
          stock: row.stock,
          unit: row.unit,
          daysToExpiry: row.days_to_expiry,
          expiryDate: row.expiry_date ? row.expiry_date.toISOString().split('T')[0] : null,
          dosage: row.dosage,
          status: row.status,
          createdAt: row.created_at.toISOString()
        })),
        plans: plans.map(row => ({
          id: row.id,
          medicineName: row.medicine_name,
          memberName: row.member_name,
          frequency: row.frequency,
          timeSlots: Array.isArray(row.time_slots) ? row.time_slots : JSON.parse(row.time_slots || '[]'),
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
          createdAt: row.created_at.toISOString()
        })),
        familyMembers: members.map(row => ({
          id: row.id,
          name: row.name,
          relationship: row.relationship,
          age: row.age,
          createdAt: row.created_at.toISOString()
        })),
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取完整数据失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取家庭统计信息
 * GET /api/sync/statistics
 */
router.get('/statistics', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const familyId = req.familyId;

    const [stats] = await pool.query(
      `SELECT 
        family_id,
        family_name,
        member_count,
        medicine_count,
        plan_count,
        family_member_count
       FROM family_statistics
       WHERE family_id = ?`,
      [familyId]
    );

    if (stats.length === 0) {
      return res.json({
        code: 0,
        message: 'success',
        data: {
          memberCount: 0,
          medicineCount: 0,
          planCount: 0,
          familyMemberCount: 0
        }
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: {
        memberCount: stats[0].member_count,
        medicineCount: stats[0].medicine_count,
        planCount: stats[0].plan_count,
        familyMemberCount: stats[0].family_member_count
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;

