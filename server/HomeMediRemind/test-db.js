// 测试脚本：验证数据库连接和表结构
const pool = require('./db');

async function testDatabase() {
  console.log('开始测试数据库连接...\n');

  try {
    // 测试连接
    const connection = await pool.getConnection();
    console.log('✓ 数据库连接成功');
    connection.release();

    // 检查新表是否存在
    const tables = ['users', 'families', 'family_user_roles'];
    for (const table of tables) {
      const [rows] = await pool.query(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✓ 表 ${table} 存在`);
      } else {
        console.log(`✗ 表 ${table} 不存在`);
      }
    }

    // 检查现有表是否添加了family_id字段
    const existingTables = ['medicines', 'plans', 'family_members'];
    for (const table of existingTables) {
      const [columns] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE 'family_id'`);
      if (columns.length > 0) {
        console.log(`✓ 表 ${table} 已添加 family_id 字段`);
      } else {
        console.log(`✗ 表 ${table} 缺少 family_id 字段`);
      }
    }

    // 检查测试数据
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n测试用户数量: ${users[0].count}`);

    const [families] = await pool.query('SELECT COUNT(*) as count FROM families');
    console.log(`测试家庭数量: ${families[0].count}`);

    const [roles] = await pool.query('SELECT COUNT(*) as count FROM family_user_roles');
    console.log(`家庭成员关系数量: ${roles[0].count}`);

    console.log('\n✓ 数据库测试完成');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 数据库测试失败:', error.message);
    process.exit(1);
  }
}

testDatabase();
