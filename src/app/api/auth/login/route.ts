import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log("Nhận từ frontend:", { email, password });

    if (!email || !password) {
      return NextResponse.json({ message: "Thiếu thông tin" }, { status: 400 });
    }

    const pool = await getPool();
    const request = pool.request();

    // Truyền đầy đủ các tham số mà thủ tục yêu cầu
    request.input("UsernameOrEmail", sql.NVarChar(255), email);
    request.input("Password", sql.NVarChar(4000), password);
    request.output("OutUserId", sql.Int);
    request.output("OutRole", sql.NVarChar(50));

    // Có thể truyền thêm IP hoặc User-Agent nếu muốn:
    request.input("IPAddress", sql.NVarChar(45), null);
    request.input("UserAgent", sql.NVarChar(512), null);

    const result = await request.execute("LoginUser");

    // Lấy kết quả output từ stored procedure
    const userId = result.output.OutUserId;
    const role = result.output.OutRole;

    if (!userId) {
      return NextResponse.json({ message: "Sai email hoặc mật khẩu" }, { status: 401 });
    }

    return NextResponse.json({
      message: "Đăng nhập thành công",
      user: { id: userId, role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: "Lỗi server" }, { status: 500 });
  }
}
