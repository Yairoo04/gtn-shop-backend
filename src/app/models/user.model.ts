import sql from 'mssql';
import { getPool } from '../lib/db';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

// Lấy user theo ID
export const getUserById = async (id: number): Promise<User | null> => {
  const pool = await getPool();
  const request = pool.request().input('id', sql.Int, id);
  const result = await request.query('SELECT * FROM Users WHERE id = @id');
  return result.recordset[0] || null;
};

// Lấy user theo email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const pool = await getPool();
  const request = pool.request().input('email', sql.NVarChar, email);
  const result = await request.query('SELECT * FROM Users WHERE email = @email');
  return result.recordset[0] || null;
};

// Tạo user mới (hash password trước khi lưu)
export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const pool = await getPool();
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const request = pool.request();
  const result = await request
    .input('email', sql.NVarChar, user.email)
    .input('password', sql.NVarChar, hashedPassword)
    .input('name', sql.NVarChar, user.name)
    .input('role', sql.NVarChar, user.role || 'user')
    .query(`
      INSERT INTO Users (email, password, name, role)
      OUTPUT INSERTED.*
      VALUES (@email, @password, @name, @role)
    `);
  return result.recordset[0];
};

// Cập nhật user (nếu cần update password thì hash lại)
export const updateUser = async (id: number, user: Partial<User>): Promise<User | null> => {
  const pool = await getPool();
  const request = pool.request()
    .input('id', sql.Int, id)
    .input('email', sql.NVarChar, user.email ?? null)
    .input('name', sql.NVarChar, user.name ?? null)
    .input('role', sql.NVarChar, user.role ?? null);

  // Nếu có password mới thì hash lại
  if (user.password) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    request.input('password', sql.NVarChar, hashedPassword);
  }

  const query = `
    UPDATE Users
    SET 
      email = ISNULL(@email, email),
      name = ISNULL(@name, name),
      role = ISNULL(@role, role)
      ${user.password ? ', password = @password' : ''}
    OUTPUT INSERTED.*
    WHERE id = @id
  `;

  const result = await request.query(query);
  return result.recordset[0] || null;
};
