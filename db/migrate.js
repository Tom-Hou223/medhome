const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database_migration.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // 创建数据库连接（不指定数据库名）
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '1234'
    });

    console.log('数据库连接成功');

    // 执行SQL脚本
    const queries = sqlContent.split(';').filter(query => query.trim() !== '');
    
    for (const query of queries) {
      try {
        await connection.execute(query);
        console.log('执行SQL成功');
      } catch (error) {
        console.error('执行SQL失败:', error.message);
      }
    }

    // 关闭连接
    await connection.end();
    console.log('数据库迁移完成');

  } catch (error) {
    console.error('数据库迁移失败:', error.message);
  }
}

migrate();