import sql from 'mssql';
import { getPool } from '../lib/db';
import bcrypt from 'bcrypt';

export interface User {
  userId: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

// Lấy user theo ID
export const getUserById = async (userId: number): Promise<User | null> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);
    const result = await request.query('SELECT * FROM dbo.Users WHERE UserId = @userId');
    console.log('User fetched:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
};

// Lấy user theo email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('email', sql.NVarChar, email);
    const result = await request.query('SELECT * FROM dbo.Users WHERE Email = @email');
    console.log('User fetched:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};

// Tạo user mới (hash password trước khi lưu)
export const createUser = async (user: Omit<User, 'userId'>): Promise<User> => {
  try {
    const pool = await getPool();
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const request = pool.request();
    const result = await request
      .input('email', sql.NVarChar, user.email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('name', sql.NVarChar, user.name)
      .input('role', sql.NVarChar, user.role || 'user')
      .query(`
        INSERT INTO dbo.Users (Email, PasswordHash, FullName, RoleId)
        OUTPUT INSERTED.*
        VALUES (@email, @password, @name, 2)
      `);
    console.log('User created:', result.recordset[0]);
    return result.recordset[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Cập nhật user (nếu cần update password thì hash lại)
export const updateUser = async (userId: number, user: Partial<User>): Promise<User | null> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('userId', sql.Int, userId)
      .input('email', sql.NVarChar, user.email ?? null)
      .input('name', sql.NVarChar, user.name ?? null)
      .input('role', sql.NVarChar, user.role ?? null);

    // Nếu có password mới thì hash lại
    if (user.password) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      request.input('password', sql.NVarChar, hashedPassword);
    }

    const query = `
      UPDATE dbo.Users
      SET 
        Email = ISNULL(@email, Email),
        FullName = ISNULL(@name, FullName)
        ${user.password ? ', PasswordHash = @password' : ''}
      OUTPUT INSERTED.*
      WHERE UserId = @userId
    `;

    const result = await request.query(query);
    console.log('User updated:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Change password using stored procedure
export const changePasswordModel = async (userId: number, oldPassword: string, newPassword: string): Promise<void> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('UserId', sql.Int, userId)
      .input('OldPassword', sql.NVarChar(4000), oldPassword)
      .input('NewPassword', sql.NVarChar(4000), newPassword);
    await request.execute('dbo.ChangePassword');
    console.log('Password changed for user:', userId);
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};