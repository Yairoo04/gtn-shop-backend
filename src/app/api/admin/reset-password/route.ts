import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';
import sql from 'mssql';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json();
    console.log('[RESET] Nhận được token:', token, 'email:', email);
    console.log('[RESET] Thời gian hiện tại:', new Date());
    if (!token || !email || !password) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin.' }, { status: 400 });
    }
    const pool = await getPool();
    // Kiểm tra token hợp lệ
    const userResult = await pool.request()
      .input('Email', sql.NVarChar, email)
      .input('Token', sql.NVarChar, token)
      .query(`SELECT * FROM dbo.Users WHERE Email = @Email AND ResetToken = @Token AND ResetTokenExpires > GETDATE() AND (RoleId = 1 OR RoleId = 3)`);
    if (userResult.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    }
    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    // Cập nhật mật khẩu và xóa token
    await pool.request()
      .input('Email', sql.NVarChar, email)
      .input('PasswordHash', sql.VarBinary, Buffer.from(hash))
      .input('PasswordSalt', sql.VarBinary, null) // bcrypt thì salt để null
      .query(`UPDATE dbo.Users SET PasswordHash = @PasswordHash, PasswordSalt = @PasswordSalt, ResetToken = NULL, ResetTokenExpires = NULL WHERE Email = @Email`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[RESET][ERROR]', err);
    return NextResponse.json({ success: false, error: 'Có lỗi xảy ra.', detail: (err as any)?.message || err }, { status: 500 });
  }
}
