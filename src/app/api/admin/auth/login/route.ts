import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';
import sql from 'mssql';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // 1. Lấy thông tin user và role
    const userResult = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`
        SELECT 
          u.UserId,
          u.Username,
          u.FullName,
          u.Email,
          u.PasswordSalt,
          u.PasswordHash,
          u.RoleId,
          u.IsActive,
          r.RoleName
        FROM dbo.Users u
        INNER JOIN dbo.Roles r ON u.RoleId = r.RoleId
        WHERE u.Email = @Email
      `);

    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sai email hoặc mật khẩu' },
        { status: 401 }
      );
    }

    const user = userResult.recordset[0];
    // Check IsActive
    if (!user.IsActive) {
      return NextResponse.json(
        { success: false, error: 'Bạn không có quyền đăng nhập vào hệ thống' },
        { status: 403 }
      );
    }

    // 2. Kiểm tra role (chỉ Admin/Staff được login vào admin panel)
    if (!['Admin', 'Staff'].includes(user.RoleName)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin or Staff role required.' },
        { status: 403 }
      );
    }

    // 3. Verify password - hỗ trợ cả SHA2 (old) và bcrypt (new)
    let isValid = false;

    // Kiểm tra xem có PasswordSalt không (SHA2 method)
    if (user.PasswordSalt) {
      // Old method: SHA2_512 with salt
      const verifyResult = await pool.request()
        .input('Salt', sql.VarBinary, user.PasswordSalt)
        .input('Password', sql.NVarChar, password)
        .input('StoredHash', sql.VarBinary, user.PasswordHash)
        .query(`
          SELECT 
            CASE 
              WHEN HASHBYTES('SHA2_512', @Salt + CONVERT(VARBINARY(MAX), @Password)) = @StoredHash 
              THEN 1 
              ELSE 0 
            END AS IsValid
        `);
      isValid = verifyResult.recordset[0].IsValid === 1;
    } else {
      // New method: bcrypt (for accounts created from admin panel)
      const passwordHash = user.PasswordHash.toString('utf-8');
      isValid = await bcrypt.compare(password, passwordHash);
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Sai email hoặc mật khẩu' },
        { status: 401 }
      );
    }

    // 4. Log audit
    await pool.request()
      .input('UserId', sql.Int, user.UserId)
      .input('Action', sql.NVarChar, 'AdminLogin')
      .input('Meta', sql.NVarChar, `IP=${req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'}`)
      .query(`
        INSERT INTO dbo.AuditLogs(UserId, Action, Meta, CreatedAt)
        VALUES (@UserId, @Action, @Meta, SYSUTCDATETIME())
      `);

    // 5. Trả về thông tin user (không gửi password)
    return NextResponse.json({
      success: true,
      data: {
        userId: user.UserId,
        username: user.Username,
        // vẫn trả về username để FE dùng nếu cần, nhưng xác thực qua email
        fullName: user.FullName,
        email: user.Email,
        role: user.RoleName,
        isActive: user.IsActive,
      }
    });

  } catch (error: any) {
    console.error('Admin Login Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
