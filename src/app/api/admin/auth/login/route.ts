import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';
import sql from 'mssql';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // 1. Lấy thông tin user và role
    const userResult = await pool.request()
      .input('Username', sql.NVarChar, username)
      .query(`
        SELECT 
          u.UserId,
          u.Username,
          u.Email,
          u.PasswordSalt,
          u.PasswordHash,
          u.RoleId,
          r.RoleName
        FROM dbo.Users u
        INNER JOIN dbo.Roles r ON u.RoleId = r.RoleId
        WHERE u.Username = @Username
      `);

    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const user = userResult.recordset[0];

    // 2. Kiểm tra role (chỉ Admin/Staff được login vào admin panel)
    if (!['Admin', 'Staff'].includes(user.RoleName)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin or Staff role required.' },
        { status: 403 }
      );
    }

    // 3. Verify password bằng SHA2_512
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

    const isValid = verifyResult.recordset[0].IsValid === 1;

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
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
        email: user.Email,
        role: user.RoleName,
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
