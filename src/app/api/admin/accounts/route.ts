import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import bcrypt from "bcrypt";
import { getPool } from "../../../lib/db";

// Helper function to add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// GET: Lấy danh sách tài khoản Admin (RoleId=1) và Staff (RoleId=3)
export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        UserId AS id,
        Username AS username,
        COALESCE(FullName, Username) AS fullName,
        Email AS email,
        Phone AS phoneNumber,
        CASE 
          WHEN RoleId = 1 THEN 'ADMIN'
          WHEN RoleId = 3 THEN 'STAFF'
          ELSE 'UNKNOWN'
        END AS role,
        CASE WHEN IsActive = 1 THEN 1 ELSE 0 END AS active,
        CreatedAt AS createdAt
      FROM dbo.Users
      WHERE RoleId IN (1, 3)
      ORDER BY CreatedAt DESC
    `);

    return NextResponse.json(result.recordset, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("GET /api/admin/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

// POST: Thêm tài khoản mới (Admin hoặc Staff)
export async function POST(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();
    const { username, fullName, email, phoneNumber, role, password } = body;

    if (!username || !email || !role) {
      return NextResponse.json(
        { error: "Username, Email và Role là bắt buộc" },
        { status: 400 }
      );
    }

    // Validate role - chỉ ADMIN (1) hoặc STAFF (3)
    const roleMap: { [key: string]: number } = {
      ADMIN: 1,
      STAFF: 3,
    };

    if (!roleMap.hasOwnProperty(role)) {
      return NextResponse.json(
        { error: "Role không hợp lệ. Chỉ chấp nhận ADMIN hoặc STAFF" },
        { status: 400 }
      );
    }

    const roleId = roleMap[role];

    // Hash password (mặc định là Username@123, viết hoa chữ cái đầu)
    const defaultPassword = username.charAt(0).toUpperCase() + username.slice(1) + "@123";
    const plainPassword = password || defaultPassword;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const passwordBuffer = Buffer.from(hashedPassword);

    // Kiểm tra username đã tồn tại chưa
    const checkUser = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT UserId FROM dbo.Users WHERE Username = @username');

    if (checkUser.recordset.length > 0) {
      return NextResponse.json(
        { error: "Username đã tồn tại" },
        { status: 409 }
      );
    }

    // Kiểm tra email đã tồn tại chưa
    const checkEmail = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT UserId FROM dbo.Users WHERE Email = @email');

    if (checkEmail.recordset.length > 0) {
      return NextResponse.json(
        { error: "Email đã được sử dụng" },
        { status: 409 }
      );
    }

    // Insert tài khoản mới
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('passwordHash', sql.VarBinary, passwordBuffer)
      .input('email', sql.NVarChar, email)
      .input('fullName', sql.NVarChar, fullName || null)
      .input('phoneNumber', sql.NVarChar, phoneNumber || null)
      .input('roleId', sql.Int, roleId)
      .query(`
        INSERT INTO dbo.Users (Username, PasswordHash, Email, FullName, Phone, RoleId, IsActive, CreatedAt)
        OUTPUT INSERTED.UserId
        VALUES (@username, @passwordHash, @email, @fullName, @phoneNumber, @roleId, 1, GETDATE())
      `);

    const newUserId = result.recordset[0].UserId;

    // Lấy thông tin tài khoản vừa tạo
    const newAccount = await pool.request()
      .input('userId', sql.Int, newUserId)
      .query(`
        SELECT 
          UserId AS id,
          Username AS username,
          COALESCE(FullName, Username) AS fullName,
          Email AS email,
          Phone AS phoneNumber,
          CASE 
            WHEN RoleId = 1 THEN 'ADMIN'
            WHEN RoleId = 3 THEN 'STAFF'
            ELSE 'UNKNOWN'
          END AS role,
          CASE WHEN IsActive = 1 THEN 1 ELSE 0 END AS active,
          CreatedAt AS createdAt
        FROM dbo.Users
        WHERE UserId = @userId
      `);

    return NextResponse.json(newAccount.recordset[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin tài khoản
export async function PUT(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();
    const { id, username, fullName, email, phoneNumber, role, active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID tài khoản là bắt buộc" },
        { status: 400 }
      );
    }

    const roleMap: { [key: string]: number } = {
      ADMIN: 1,
      STAFF: 3,
    };

    const roleId = role ? roleMap[role] : undefined;

    // Kiểm tra tài khoản có tồn tại không (chỉ Admin hoặc Staff)
    const checkAccount = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT UserId FROM dbo.Users WHERE UserId = @id AND RoleId IN (1, 3)');

    if (checkAccount.recordset.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản" },
        { status: 404 }
      );
    }

    // Kiểm tra username trùng (nếu có thay đổi)
    if (username) {
      const checkUsername = await pool.request()
        .input('username', sql.NVarChar, username)
        .input('id', sql.Int, id)
        .query('SELECT UserId FROM dbo.Users WHERE Username = @username AND UserId != @id');
      
      if (checkUsername.recordset.length > 0) {
        return NextResponse.json(
          { error: "Username đã tồn tại" },
          { status: 409 }
        );
      }
    }

    // Kiểm tra email trùng (nếu có thay đổi)
    if (email) {
      const checkEmail = await pool.request()
        .input('email', sql.NVarChar, email)
        .input('id', sql.Int, id)
        .query('SELECT UserId FROM dbo.Users WHERE Email = @email AND UserId != @id');
      
      if (checkEmail.recordset.length > 0) {
        return NextResponse.json(
          { error: "Email đã được sử dụng" },
          { status: 409 }
        );
      }
    }

    // Build UPDATE query dynamically
    const updates: string[] = [];
    const request = pool.request();
    request.input('id', sql.Int, id);

    if (username !== undefined) {
      updates.push("Username = @username");
      request.input('username', sql.NVarChar, username);
    }
    if (fullName !== undefined) {
      updates.push("FullName = @fullName");
      request.input('fullName', sql.NVarChar, fullName || null);
    }
    if (email !== undefined) {
      updates.push("Email = @email");
      request.input('email', sql.NVarChar, email);
    }
    if (phoneNumber !== undefined) {
      updates.push("Phone = @phoneNumber");
      request.input('phoneNumber', sql.NVarChar, phoneNumber || null);
    }
    if (roleId !== undefined) {
      updates.push("RoleId = @roleId");
      request.input('roleId', sql.Int, roleId);
    }
    if (active !== undefined) {
      updates.push("IsActive = @active");
      request.input('active', sql.Bit, active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Không có thông tin nào để cập nhật" },
        { status: 400 }
      );
    }

    const query = `UPDATE dbo.Users SET ${updates.join(", ")} WHERE UserId = @id`;
    await request.query(query);

    // Lấy thông tin tài khoản sau khi update
    const updated = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          UserId AS id,
          Username AS username,
          COALESCE(FullName, Username) AS fullName,
          Email AS email,
          Phone AS phoneNumber,
          CASE 
            WHEN RoleId = 1 THEN 'ADMIN'
            WHEN RoleId = 3 THEN 'STAFF'
            ELSE 'UNKNOWN'
          END AS role,
          CASE WHEN IsActive = 1 THEN 1 ELSE 0 END AS active,
          CreatedAt AS createdAt
        FROM dbo.Users
        WHERE UserId = @id
      `);

    return NextResponse.json(updated.recordset[0]);
  } catch (error: any) {
    console.error("PUT /api/admin/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa tài khoản
export async function DELETE(req: NextRequest) {
  try {
    const pool = await getPool();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID tài khoản là bắt buộc" },
        { status: 400 }
      );
    }

    // Kiểm tra tài khoản có tồn tại không
    const checkAccount = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT UserId, RoleId FROM dbo.Users WHERE UserId = @id AND RoleId IN (1, 3)');

    if (checkAccount.recordset.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản hoặc không có quyền xóa" },
        { status: 404 }
      );
    }

    const account = checkAccount.recordset[0];

    // Không cho phép xóa tài khoản Admin (RoleId = 1)
    if (account.RoleId === 1) {
      return NextResponse.json(
        { error: "Không thể xóa tài khoản Admin. Chỉ có thể xóa tài khoản Staff." },
        { status: 403 }
      );
    }

    // Xóa audit logs liên quan trước (để tránh foreign key constraint)
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM dbo.AuditLogs WHERE UserId = @id');

    // Sau đó xóa tài khoản
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM dbo.Users WHERE UserId = @id');

    return NextResponse.json({ message: "Xóa tài khoản thành công" });
  } catch (error: any) {
    console.error("DELETE /api/admin/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Đổi mật khẩu
export async function PATCH(req: NextRequest) {
  try {
    console.log("🔐 PATCH /api/admin/accounts - Change password request received");
    
    const pool = await getPool();
    const body = await req.json();
    const { id, currentPassword, newPassword } = body;

    console.log("📝 Request data:", { id, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

    if (!id || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "ID, mật khẩu cũ và mật khẩu mới là bắt buộc" },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Lấy thông tin tài khoản (chỉ Admin hoặc Staff)
    const accountResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT UserId, PasswordHash FROM dbo.Users WHERE UserId = @id AND RoleId IN (1, 3)');

    if (accountResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản" },
        { status: 404, headers: corsHeaders() }
      );
    }

    const account = accountResult.recordset[0];

    // Kiểm tra mật khẩu cũ
    const isPasswordValid = await bcrypt.compare(currentPassword, account.PasswordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Mật khẩu cũ không đúng" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const passwordBuffer = Buffer.from(hashedPassword);

    // Cập nhật mật khẩu
    await pool.request()
      .input('id', sql.Int, id)
      .input('passwordHash', sql.VarBinary, passwordBuffer)
      .query('UPDATE dbo.Users SET PasswordHash = @passwordHash WHERE UserId = @id');

    console.log("✅ Password changed successfully for user:", id);

    return NextResponse.json({ message: "Đổi mật khẩu thành công" }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error("PATCH /api/admin/accounts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
