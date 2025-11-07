import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import bcrypt from "bcrypt";
import { getPool } from "../../../../lib/db";

// POST: Đổi mật khẩu
export async function POST(req: NextRequest) {
  try {
    console.log("🔐 POST /api/admin/accounts/change-password - Change password request received");
    
    const pool = await getPool();
    const body = await req.json();
    const { id, currentPassword, newPassword } = body;

    console.log("📝 Request data:", { id, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

    if (!id || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "ID, mật khẩu cũ và mật khẩu mới là bắt buộc" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    // Lấy thông tin tài khoản (chỉ Admin hoặc Staff)
    const accountResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT UserId, PasswordHash FROM dbo.Users WHERE UserId = @id AND RoleId IN (1, 3)');

    if (accountResult.recordset.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản" },
        { status: 404 }
      );
    }

    const account = accountResult.recordset[0];

    // Kiểm tra mật khẩu cũ - Convert Buffer to string
    const passwordHash = account.PasswordHash.toString('utf-8');
    const isPasswordValid = await bcrypt.compare(currentPassword, passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Mật khẩu cũ không đúng" },
        { status: 401 }
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

    return NextResponse.json({ message: "Đổi mật khẩu thành công" });
  } catch (error: any) {
    console.error("POST /api/admin/accounts/change-password error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
