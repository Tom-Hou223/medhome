const mysql = require('mysql2/promise');

// 数据库连接池配置
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '200302',
  database: 'family_medicine_db2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    
    // 测试简单查询
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    
    connection.release();
  } catch (err) {
    // 数据库连接失败
  }
}

testDbConnection();

module.exports = pool;