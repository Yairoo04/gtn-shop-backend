import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key_gtnshop";
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Thiếu thông tin đăng nhập" }, { status: 400 });
    }

    const pool = await getPool();
    const request = pool.request();

    // Truyền đúng các tham số của thủ tục LoginUser
    request.input("UsernameOrEmail", sql.NVarChar(255), email);
    request.input("Password", sql.NVarChar(4000), password);
    request.output("OutUserId", sql.Int);
    request.output("OutRole", sql.NVarChar(50));

    // Có thể truyền thêm IP hoặc UserAgent nếu cần
    request.input("IPAddress", sql.NVarChar(45), null);
    request.input("UserAgent", sql.NVarChar(512), null);

    const result = await request.execute("LoginUser");

    const userId = result.output.OutUserId;
    const role = result.output.OutRole;

    if (!userId) {
      // Trường hợp login sai: SQL RAISERROR đã log rồi
      return NextResponse.json({ message: "Sai email hoặc mật khẩu" }, { status: 401 });
    }

    // Tạo token JWT
    const token = jwt.sign(
      { id: userId, email, role },
      JWT_SECRET,
      { expiresIn: "2d" } // hết hạn sau 2 ngày
    );

    // Login thành công
    return NextResponse.json({
      message: "Đăng nhập thành công",
      user: { id: userId, email,role },
      token,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    // Bắt lỗi RAISERROR từ SQL (error.message chứa thông báo)
    const message =
      error?.originalError?.info?.message ||
      error?.message ||
      "Lỗi máy chủ khi đăng nhập";

    return NextResponse.json({ message }, { status: 500 });
  }
}
