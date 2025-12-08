// src/lib/mssql.ts
import sql from 'mssql';

const DB_NAME =
  process.env.DB_DATABASE || process.env.DB_NAME || 'GTN_Shop';

const config: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_SERVER as string, // ví dụ 'YAIRO'
  database: DB_NAME,                        // <<< DÙNG DB_DATABASE
  port: Number(process.env.DB_PORT ?? 1433),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;

  pool = await sql.connect(config);

  // Log để kiểm tra node đang ở DB nào
  const info = await pool
    .request()
    .query('SELECT DB_NAME() AS currentDb, @@SERVERNAME AS serverName');
  console.log('MSSQL connected:', {
    configDb: config.database,
    currentDb: info.recordset[0].currentDb,
    serverName: info.recordset[0].serverName,
  });

  return pool;
}

export { sql };
