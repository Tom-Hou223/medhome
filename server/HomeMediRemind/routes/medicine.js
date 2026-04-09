const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { checkCurrentFamilyAccess, checkCurrentFamilyAdmin, getCurrentFamilyId } = require('../middleware/permission');
const recognitionService = require('../services/recognitionService');
const multer = require('multer');

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024 // 限制4MB
  }
});

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

    // 动态计算 days_to_expiry
    const [rows] = await pool.query(
      `SELECT 
        id, name, manufacturer, specification, category, stock, unit, 
        DATEDIFF(expiry_date, CURDATE()) as days_to_expiry,
        expiry_date,
        dosage, created_at,
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
    
    // 转换数据库结果为前端需要的格式
    const medicines = rows.map(row => ({
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
      createdAt: row.created_at.toISOString(),
      status: row.status
    }));
    
    res.json({
      code: 0,
      message: 'success',
      data: medicines
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.post('/add', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { name, manufacturer, specification, category, stock, unit, expiryDate, dosage } = req.body;
    const familyId = req.familyId;
    const id = Date.now();

    // 插入数据，不再存储 days_to_expiry 和 status（动态计算）
    await pool.query(
      'INSERT INTO medicines (id, family_id, name, manufacturer, specification, category, stock, unit, expiry_date, dosage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, familyId, name, manufacturer, specification, category, stock, unit, expiryDate, dosage]
    );
    
    // 查询刚插入的数据（包含动态计算的字段）
    const [rows] = await pool.query(
      `SELECT 
        id, name, manufacturer, specification, category, stock, unit, 
        DATEDIFF(expiry_date, CURDATE()) as days_to_expiry,
        expiry_date,
        dosage, created_at,
        CASE 
          WHEN expiry_date IS NULL THEN 'normal'
          WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 'expired'
          WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'expiring'
          ELSE 'normal'
        END as status
      FROM medicines 
      WHERE id = ?`,
      [id]
    );
    
    const newMedicine = {
      id: rows[0].id,
      name: rows[0].name,
      manufacturer: rows[0].manufacturer,
      specification: rows[0].specification,
      category: rows[0].category,
      stock: rows[0].stock,
      unit: rows[0].unit,
      daysToExpiry: rows[0].days_to_expiry,
      expiryDate: rows[0].expiry_date ? rows[0].expiry_date.toISOString().split('T')[0] : null,
      dosage: rows[0].dosage,
      createdAt: rows[0].created_at.toISOString(),
      status: rows[0].status
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: newMedicine
    });
  } catch (error) {
    console.error('添加药品失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

router.put('/update/:id', auth, checkCurrentFamilyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, manufacturer, specification, category, stock, unit, expiryDate, dosage } = req.body;
    const familyId = req.familyId;

    // 更新数据，不再存储 days_to_expiry 和 status（动态计算）
    const [result] = await pool.query(
      'UPDATE medicines SET name = ?, manufacturer = ?, specification = ?, category = ?, stock = ?, unit = ?, expiry_date = ?, dosage = ? WHERE id = ? AND family_id = ?',
      [name, manufacturer, specification, category, stock, unit, expiryDate, dosage, id, familyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Medicine not found'
      });
    }
    
    // 查询更新后的数据（包含动态计算的字段）
    const [rows] = await pool.query(
      `SELECT 
        id, name, manufacturer, specification, category, stock, unit, 
        DATEDIFF(expiry_date, CURDATE()) as days_to_expiry,
        expiry_date,
        dosage,
        CASE 
          WHEN expiry_date IS NULL THEN 'normal'
          WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 'expired'
          WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'expiring'
          ELSE 'normal'
        END as status
      FROM medicines 
      WHERE id = ?`,
      [id]
    );
    
    const updatedMedicine = {
      id: rows[0].id,
      name: rows[0].name,
      manufacturer: rows[0].manufacturer,
      specification: rows[0].specification,
      category: rows[0].category,
      stock: rows[0].stock,
      unit: rows[0].unit,
      daysToExpiry: rows[0].days_to_expiry,
      expiryDate: rows[0].expiry_date ? rows[0].expiry_date.toISOString().split('T')[0] : null,
      dosage: rows[0].dosage,
      status: rows[0].status
    };
    
    res.json({
      code: 0,
      message: 'success',
      data: updatedMedicine
    });
  } catch (error) {
    console.error('更新药品失败:', error);
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
      'DELETE FROM medicines WHERE id = ? AND family_id = ?',
      [id, familyId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: 'Medicine not found'
      });
    }
    
    res.json({
      code: 0,
      message: 'success'
    });
  } catch (error) {
    console.error('删除药品失败:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
});

/**
 * 条形码识别
 * POST /api/medicine/recognize/barcode
 * Body: { barcode: string }
 */
router.post('/recognize/barcode', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const { barcode } = req.body;
    const userId = req.user.id;
    const familyId = req.familyId;

    if (!barcode) {
      return res.status(400).json({
        code: 400,
        message: '缺少条形码参数'
      });
    }

    // 调用识别服务
    const result = await recognitionService.recognizeBarcode(barcode);

    if (result.success) {
      // 如果有家庭ID，保存识别历史
      if (familyId) {
        await recognitionService.saveRecognitionHistory(
          userId,
          familyId,
          'barcode',
          barcode,
          result.data
        );
      }

      res.json({
        code: 0,
        message: '识别成功',
        data: result.data
      });
    } else {
      res.status(404).json({
        code: 404,
        message: result.message || '未找到该药品信息'
      });
    }
  } catch (error) {
    console.error('条形码识别失败:', error);
    res.status(500).json({
      code: 500,
      message: '识别失败: ' + error.message
    });
  }
});

/**
 * 图片识别
 * POST /api/medicine/recognize/image
 * FormData: { image: File }
 */
router.post('/recognize/image', auth, checkCurrentFamilyAccess, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const familyId = req.familyId;

    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '缺少图片文件'
      });
    }

    // 调用识别服务
    const result = await recognitionService.recognizeImage(req.file.buffer);

    if (result.success) {
      // 如果有家庭ID，保存识别历史
      if (familyId) {
        await recognitionService.saveRecognitionHistory(
          userId,
          familyId,
          'image',
          req.file.originalname,
          result.data
        );
      }

      res.json({
        code: 0,
        message: '识别成功',
        data: result.data
      });
    } else {
      res.status(500).json({
        code: 500,
        message: result.message || '识别失败'
      });
    }
  } catch (error) {
    console.error('图片识别失败:', error);
    res.status(500).json({
      code: 500,
      message: '识别失败: ' + error.message
    });
  }
});

/**
 * 获取识别历史
 * GET /api/medicine/recognize/history?page=1&limit=20
 */
router.get('/recognize/history', auth, checkCurrentFamilyAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const familyId = req.familyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 如果没有选择家庭，返回空数据
    if (!familyId) {
      return res.json({
        code: 0,
        message: 'success',
        data: {
          list: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      });
    }

    // 获取总数
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM recognition_history
      WHERE user_id = ? AND family_id = ?
    `, [userId, familyId]);

    const total = countResult[0].total;

    // 获取识别历史列表
    const [history] = await pool.query(`
      SELECT id, type, input_data, recognition_result, is_added, created_at
      FROM recognition_history
      WHERE user_id = ? AND family_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, familyId, limit, offset]);

    // 解析JSON结果
    const list = history.map(item => ({
      id: item.id,
      type: item.type,
      inputData: item.input_data,
      result: JSON.parse(item.recognition_result),
      isAdded: item.is_added,
      createdAt: item.created_at
    }));

    res.json({
      code: 0,
      message: '获取识别历史成功',
      data: {
        list,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取识别历史失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取识别历史失败: ' + error.message
    });
  }
});

module.exports = router;