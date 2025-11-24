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

    // Lay them thong tin nguoi dung tu bang users
    const userQuery = await pool
      .request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT 
          Username, 
          FullName, 
          Email, 
          Phone, 
          RoleId, 
          IsActive 
        FROM Users 
        WHERE UserId = @UserId
      `);
      const userInfo = userQuery.recordset[0]||{};

    // Nếu tài khoản bị khóa (IsActive = 0), không cho đăng nhập
    if (userInfo.IsActive === false || userInfo.IsActive === 0) {
      return NextResponse.json({ message: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." }, { status: 403 });
    }

    // Tạo token JWT
    const token = jwt.sign(
      { id: userId, email, role },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    // Login thành công
    return NextResponse.json({
      message: "Đăng nhập thành công",
      user: { id: userId,
        username: userInfo.Username || "",
        fullname: userInfo.FullName || "",
        email: userInfo.Email || email,
        phone: userInfo.Phone || "",
        role: role || userInfo.RoleId,
        isActive: userInfo.IsActive,
       },
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
