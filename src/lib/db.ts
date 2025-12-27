import sql from 'mssql';

export function getPool() {
  // Cấu hình kết nối SQL Server
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
  return new sql.ConnectionPool(config).connect();
}
