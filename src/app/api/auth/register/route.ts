import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";

export async function POST(req: Request) {
  try {
    const { username, email, password, phone } = await req.json();
    if (!username || !email || !password) {
      return NextResponse.json({ message: "Thiếu thông tin" }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("Username", username)
      .input("Email", email)
      .input("Password", password)
      .input("Phone", phone || null)
      .execute("RegisterUser");

    const newUserId = result.recordset?.[0]?.NewUserId;
    return NextResponse.json({ message: "Đăng ký thành công", userId: newUserId });
  } catch (error: any) {
    console.error("Register error:", error);

    if (error.number === 50004)
      return NextResponse.json({ message: "Tên đăng nhập hoặc email đã tồn tại" }, { status: 400 });
    if (error.number === 50005)
      return NextResponse.json({ message: "Mật khẩu quá yếu" }, { status: 400 });

    return NextResponse.json({ message: "Lỗi server" }, { status: 500 });
  }
}
