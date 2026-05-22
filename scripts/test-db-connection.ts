/**
 * PostgreSQL 15 连接测试脚本
 * 用于验证本机数据库连接配置是否正确
 */

import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载环境变量
config({ path: resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5434', 10),
  database: process.env.DB_NAME || 'yyc3_integration_center',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function testDatabaseConnection() {
  console.log('🔍 开始测试 PostgreSQL 15 数据库连接...\n');
  
  console.log('📋 连接配置:');
  console.log(`   主机: ${dbConfig.host}`);
  console.log(`   端口: ${dbConfig.port}`);
  console.log(`   数据库: ${dbConfig.database}`);
  console.log(`   用户: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? '启用' : '禁用'}\n`);

  const pool = new Pool(dbConfig);
  let client;

  try {
    // 测试1: 建立连接
    console.log('✅ 步骤 1/4: 尝试建立数据库连接...');
    client = await pool.connect();
    console.log('   ✓ 数据库连接成功！\n');

    // 测试2: 查询版本信息
    console.log('✅ 步骤 2/4: 查询数据库版本...');
    const versionResult = await client.query('SELECT version()');
    console.log(`   ✓ PostgreSQL 版本: ${versionResult.rows[0].version.split(',')[0]}\n`);

    // 测试3: 检查当前数据库
    console.log('✅ 步骤 3/4: 验证当前数据库...');
    const dbResult = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()');
    const row = dbResult.rows[0];
    console.log(`   ✓ 当前数据库: ${row.current_database}`);
    console.log(`   ✓ 当前用户: ${row.current_user}`);
    console.log(`   ✓ 服务器地址: ${row.inet_server_addr}:${row.inet_server_port}\n`);

    // 测试4: 创建测试表（如果不存在）并插入测试数据
    console.log('✅ 步骤 4/4: 测试基本CRUD操作...');
    
    // 创建测试表
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_message VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ 测试表创建/验证成功');

    // 插入测试数据
    const insertResult = await client.query(
      'INSERT INTO connection_test (test_message) VALUES ($1) RETURNING id, test_message, created_at',
      ['YYC³集成中心 - 数据库连接测试成功!']
    );
    console.log(`   ✓ 插入测试数据成功 (ID: ${insertResult.rows[0].id})`);

    // 查询测试数据
    const selectResult = await client.query('SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 5');
    console.log(`   ✓ 查询成功，共 ${selectResult.rowCount} 条记录`);

    // 清理测试数据
    await client.query('DELETE FROM connection_test WHERE id = $1', [insertResult.rows[0].id]);
    console.log('   ✓ 测试数据清理完成\n');

    console.log('🎉 所有测试通过！数据库连接完全正常。\n');
    
    // 输出连接池状态
    console.log('📊 连接池状态:');
    console.log(`   总连接数: ${pool.totalCount}`);
    console.log(`   空闲连接数: ${pool.idleCount}`);
    console.log(`   等待中的请求: ${pool.waitingCount}\n`);
    
    return true;
  } catch (error: any) {
    console.error('\n❌ 数据库连接失败！');
    console.error('\n📛 错误详情:');
    console.error(`   错误代码: ${error.code || 'UNKNOWN'}`);
    console.error(`   错误消息: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 可能的原因:');
      console.error('   1. PostgreSQL 服务未启动');
      console.error(`   2. 端口 ${dbConfig.port} 未监听（检查端口是否正确，默认为5432）`);
      console.error('   3. 防火墙阻止了连接');
    } else if (error.code === '28P01') {
      console.error('\n💡 可能的原因:');
      console.error('   用户名或密码错误');
      console.error('   请检查 .env.local 中的 DB_USER 和 DB_PASSWORD 配置');
    } else if (error.code === '3D000') {
      console.error('\n💡 可能的原因:');
      console.error(`   数据库 "${dbConfig.database}" 不存在`);
      console.error('   请先创建数据库: createdb yyc3_integration_center');
    }
    
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('🔒 连接池已关闭');
  }
}

// 执行测试
testDatabaseConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ 测试脚本执行异常:', error);
    process.exit(1);
  });
