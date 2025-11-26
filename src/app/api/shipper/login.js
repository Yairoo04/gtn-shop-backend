// API đăng nhập cho shipper: /api/shipper/login
// POST: { username, password }
// Trả về user nếu đúng, chỉ cho phép role SHIPPER (rules=4)

import db from '../../db'; // Giả sử bạn có module db để truy vấn
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng nhập' });
  }
  try {
    // Lấy user theo username
    const user = await db('Accounts').where({ username }).first();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }
    // Kiểm tra role
    if (user.role !== 'SHIPPER' && user.rules !== 4) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
    }
    // Kiểm tra mật khẩu
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }
    // Trả về thông tin user (ẩn mật khẩu)
    const { password: _, ...userData } = user;
    return res.status(200).json({ success: true, user: userData });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: e.message });
  }
}
