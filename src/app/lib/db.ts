// db.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

console.log('Environment variables:', {
  user: process.env.DB_USER,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
});

const config: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  server: process.env.DB_SERVER!,
  database: process.env.DB_DATABASE!,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export const getPool = async () => {
  try {
    if (pool) {
      return pool; // đã có pool sẵn
    }
    pool = await new sql.ConnectionPool(config).connect();
    console.log('✅ Connected to SQL Server:', config.database);

    // Test query
    const testResult = await pool.request().query('SELECT 1 AS test');
    console.log('Test query result:', testResult.recordset);

    return pool;
  } catch (err) {
    console.error('DB Connection failed:', err);
    throw err;
  }
};
