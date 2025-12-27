import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../../lib/db';
import sql from 'mssql';
import crypto from 'crypto';
import { sendMail } from '../../../lib/mail';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email là bắt buộc' }, { status: 400 });
    }
    const pool = await getPool();
    // Kiểm tra admin tồn tại
    const adminResult = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query(`SELECT * FROM dbo.Users WHERE Email = @Email AND (RoleId = 1 OR RoleId = 3)`);
    console.log('DEBUG adminResult:', adminResult.recordset, 'Email input:', email);
    if (adminResult.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy tài khoản admin hoặc staff phù hợp.' }, { status: 404 });
    }
    // Tạo token reset password
    const token = crypto.randomBytes(32).toString('hex');
    // Cộng thêm 7 tiếng để đúng giờ Việt Nam (UTC+7)
    const expires = new Date(Date.now() + 1000 * 60 * 30 + 7 * 60 * 60 * 1000); // 30 phút + 7 tiếng
    console.log('[FORGOT] Token tạo ra:', token, 'ResetTokenExpires (VN):', expires);
    // Lưu token vào DB (giả sử có cột ResetToken, ResetTokenExpires)
    await pool.request()
      .input('Email', sql.NVarChar, email)
      .input('Token', sql.NVarChar, token)
      .input('Expires', sql.DateTime, expires)
      .query(`UPDATE dbo.Users SET ResetToken = @Token, ResetTokenExpires = @Expires WHERE Email = @Email`);
    // Kiểm tra lại token thực tế trong DB
    const check = await pool.request()
      .input('Email', sql.NVarChar, email)
      .query('SELECT ResetToken FROM dbo.Users WHERE Email = @Email');
    console.log('[FORGOT] Token trong DB sau UPDATE:', check.recordset[0]?.ResetToken);
    // Gửi email thực tế
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    console.log('[FORGOT] Link gửi mail:', resetLink);
    await sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu Admin GTN Shop',
      html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu admin.</p><p>Nhấn vào link sau để đặt lại mật khẩu (có hiệu lực 30 phút):<br><a href="${resetLink}">${resetLink}</a></p>`
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Có lỗi xảy ra.' }, { status: 500 });
  }
}
