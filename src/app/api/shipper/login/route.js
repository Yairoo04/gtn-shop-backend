// API đăng nhập cho shipper: /api/shipper/login
// POST: { username, password }
// Trả về user nếu đúng, chỉ cho phép role SHIPPER (rules=4)


import { getPool } from '../../../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Thiếu thông tin đăng nhập' }), { status: 400 });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input('username', username)
      .query('SELECT TOP 1 * FROM Users WHERE Username = @username');
    const user = result.recordset[0];
    console.log('user:', user);
    if (!user) {
      return new Response(JSON.stringify({ success: false, message: 'Tài khoản không tồn tại', userNotFound: true }), { status: 401 });
    }
    // Kiểm tra role: RoleId = 4 là Shipper
    if (user.RoleId !== 4) {
      return new Response(JSON.stringify({ success: false, message: 'Bạn không có quyền truy cập' }), { status: 403 });
    }
    // Kiểm tra tài khoản có bị khóa không
    if (!user.IsActive) {
      return new Response(JSON.stringify({ success: false, message: 'Tài khoản đã bị khóa. Vui lòng liên hệ admin.' }), { status: 403 });
    }
    // Kiểm tra mật khẩu: PasswordHash là buffer, cần chuyển về string để so sánh
    const hashBuffer = user.PasswordHash;
    const hash = Buffer.isBuffer(hashBuffer) ? hashBuffer.toString('utf8') : hashBuffer;
    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, message: 'Sai tài khoản hoặc mật khẩu' }), { status: 401 });
    }
    // Trả về thông tin user (ẩn mật khẩu)
    const { PasswordHash, PasswordSalt, ...userData } = user;
    return new Response(JSON.stringify({ success: true, user: userData }), { status: 200 });
  } catch (e) {
    console.error('Shipper login error:', e);
    return new Response(JSON.stringify({ success: false, message: 'Lỗi máy chủ', error: e.message }), { status: 500 });
  }
}
