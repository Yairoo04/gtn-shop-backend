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

//Lấy user theo ID
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

//Lấy user theo email
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


// Lay user theo id
export const getUserByIdCustomer = async (userId: number): Promise<any | null> => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          U.UserId,
          U.Username,
          U.Email,
          U.FullName,
          U.Phone,
          U.Gender,
          U.IsActive,
          U.CreatedAt,
          U.UpdatedAt,
          R.RoleName,
          CT.TypeName AS CustomerTypeName,
          CT.DiscountPercent,
          CT.Description AS CustomerTypeDescription
        FROM dbo.Users AS U
        INNER JOIN dbo.Roles AS R ON U.RoleId = R.RoleId
        LEFT JOIN dbo.CustomerTypes AS CT ON U.CustomerTypeId = CT.CustomerTypeId
        WHERE U.UserId = @userId
      `);

    const user = result.recordset[0] || null;
    console.log("getUserByIdCustomer ->", user);
    return user;
  } catch (error) {
    console.error("Error in getUserByIdCustomer:", error);
    throw error;
  }
};

// Lấy user theo email
export const getUserByEmailCustomer = async (email: string) => {
  const pool = await getPool();
  const result = await pool.request()
    .input("email", sql.NVarChar, email)
    .query(`
      SELECT 
        u.FullName,
        u.Email,
        u.Phone,
        u.Gender,
        ct.TypeName AS CustomerType
      FROM dbo.Users u
      LEFT JOIN dbo.CustomerTypes ct ON u.CustomerTypeId = ct.CustomerTypeId
      WHERE u.Email = @email
    `);

  return result.recordset[0];
};


export const getAllCustomers = async (): Promise<any[]> => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        U.UserId,
        U.Username,
        U.Email,
        U.FullName,
        U.Phone,
        U.Gender,
        U.IsActive,
        U.CreatedAt,
        R.RoleName,
        CT.TypeName AS CustomerTypeName,
        CT.DiscountPercent
      FROM dbo.Users AS U
      INNER JOIN dbo.Roles AS R ON U.RoleId = R.RoleId
      LEFT JOIN dbo.CustomerTypes AS CT ON U.CustomerTypeId = CT.CustomerTypeId
      WHERE R.RoleName = N'Customer'
    `);

    console.log("getAllCustomers ->", result.recordset.length, "users found");
    return result.recordset;
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    throw error;
  }
};

// Cập nhật thông tin user
export const updateUserInfoCustomer = async (email: string, data: any) => {
  const pool = await getPool();
  const { fullName, gender, phone } = data;

  await pool.request()
    .input("email", sql.NVarChar, email)
    .input("fullName", sql.NVarChar, fullName)
    .input("gender", sql.NVarChar, gender)
    .input("phone", sql.NVarChar, phone)
    .query(`
      UPDATE dbo.Users
      SET FullName = @fullName,
          Gender = @gender,
          Phone = @phone,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Email = @email
    `);
};

export async function changePasswordModelCustomer(
  userId: number,
  oldPassword: string,
  newPassword: string
) {
  const pool = await getPool();

  // Lấy mật khẩu cũ từ DB (đúng tên bảng và cột)
  const userResult = await pool
    .request()
    .input("UserId", sql.Int, userId)
    .query("SELECT PasswordHash FROM dbo.Users WHERE UserId = @UserId");

  const user = userResult.recordset[0];
  if (!user) throw new Error("User not found");

  // So sánh mật khẩu cũ
  const isMatch = await bcrypt.compare(oldPassword, user.PasswordHash);
  if (!isMatch) throw new Error("Old password is incorrect");

  // Hash mật khẩu mới
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Cập nhật mật khẩu mới
  await pool
    .request()
    .input("UserId", sql.Int, userId)
    .input("NewPassword", sql.NVarChar, hashedPassword)
    .query(`
      UPDATE dbo.Users
      SET PasswordHash = @NewPassword, UpdatedAt = SYSUTCDATETIME()
      WHERE UserId = @UserId
    `);

  console.log("Password updated for user:", userId);
}
