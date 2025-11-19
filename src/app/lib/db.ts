// src/lib/db.ts

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

console.log('Environment variables:', {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '[hidden]' : undefined,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});

const config: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  server: process.env.DB_SERVER!,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT ?? 1433),
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

export const getPool = async (): Promise<sql.ConnectionPool> => {
  try {
    if (pool && pool.connected) return pool;
    pool = await new sql.ConnectionPool(config).connect();
    console.log('✅ Connected to SQL Server:', config.database);

    // 🔥 Check database Node is really executing on
    const dbInfo = await pool.request().query(`
        SELECT DB_NAME() AS currentDb, @@SERVERNAME AS serverName
    `);
    console.log("🔥 NODE is actually using:", dbInfo.recordset[0]);

    return pool;
  } catch (err) {
    console.error('DB Connection failed:', err);
    throw err;
  }
};
