import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";

export async function POST(req: Request) {
  try {
    const { username, email, password, phone } = await req.json();

    // Kiểm tra đầu vào
    if (!username || !email || !password) {
      return NextResponse.json({ message: "Thiếu thông tin" }, { status: 400 });
    }

    // Kết nối và gọi stored procedure
    const pool = await getPool();
    const result = await pool.request()
      .input("Username", sql.NVarChar(100), username)
      .input("Email", sql.NVarChar(255), email)
      .input("Password", sql.NVarChar(4000), password) // <-- TRUYỀN RAW PASSWORD
      .input("Phone", sql.NVarChar(50), phone || null)
      .execute("RegisterUser");

    const newUserId = result.recordset?.[0]?.NewUserId;

    return NextResponse.json({
      message: "Đăng ký thành công",
      userId: newUserId,
    });
  } catch (error: any) {
    console.error("Register error:", error);

    // Nếu lỗi được ném từ SQL (RAISERROR)
    const msg =
      error?.originalError?.info?.message ||
      error?.message ||
      "Lỗi server khi đăng ký";

    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
