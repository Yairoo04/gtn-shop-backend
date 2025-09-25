import sql from 'mssql';
import dbPool from '../lib/db';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

export const getUserById = async (id: number): Promise<User | null> => {
  const request = dbPool.request().input('id', sql.Int, id);
  const result = await request.query('SELECT * FROM Users WHERE id = @id');
  return result.recordset[0] || null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const request = dbPool.request().input('email', sql.NVarChar, email);
  const result = await request.query('SELECT * FROM Users WHERE email = @email');
  return result.recordset[0] || null;
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const request = dbPool.request();
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

export const updateUser = async (id: number, user: Partial<User>): Promise<User | null> => {
  const request = dbPool.request();
  const result = await request
    .input('id', sql.Int, id)
    .input('email', sql.NVarChar, user.email)
    .input('name', sql.NVarChar, user.name)
    .input('role', sql.NVarChar, user.role)
    .query(`
      UPDATE Users
      SET email = @email, name = @name, role = @role
      OUTPUT INSERTED.*
      WHERE id = @id
    `);
  return result.recordset[0] || null;
};