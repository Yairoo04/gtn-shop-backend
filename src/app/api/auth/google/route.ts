import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "secret_key_gtnshop";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ message: "Thiếu token từ Google" }, { status: 400 });
    }

    // Xác thực token Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json({ message: "Không nhận được email từ Google" }, { status: 400 });
    }

    const email = payload.email;
    const googleName = payload.name || "Người dùng Google";
    const usernameBase = email.split("@")[0];

    const pool = await getPool();

    // Kiểm tra user đã tồn tại chưa
    const checkUser = await pool
      .request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT UserId, RoleId FROM Users WHERE Email = @Email");

    let userId: number;
    let roleId: number = 2;

    if (checkUser.recordset.length === 0) {
      // === ĐĂNG KÝ MỚI – DÙNG SP RegisterUser ĐỂ ĐẢM BẢO HASH ĐÚNG 100% ===
      const tempPassword = "GoogleAuth@123"; // Mật khẩu mạnh, đáp ứng đủ điều kiện SP

      // Kiểm tra username trùng → tạo username duy nhất
      const checkUsername = await pool
        .request()
        .input("Username", sql.NVarChar(100), usernameBase)
        .query("SELECT 1 FROM Users WHERE Username = @Username");

      const finalUsername = checkUsername.recordset.length > 0
        ? `${usernameBase}_${Date.now().toString().slice(-6)}`
        : usernameBase;

      // GỌI SP RegisterUser → HASH ĐÚNG HOÀN TOÀN
      const registerResult = await pool
        .request()
        .input("Username", sql.NVarChar(100), finalUsername)
        .input("Email", sql.NVarChar(255), email)
        .input("Password", sql.NVarChar(4000), tempPassword)
        .input("Phone", sql.NVarChar(50), null)
        .execute("RegisterUser");

      userId = registerResult.recordset[0].NewUserId;

      // Cập nhật FullName từ Google (SP RegisterUser không có cột FullName)
      await pool
        .request()
        .input("UserId", sql.Int, userId)
        .input("FullName", sql.NVarChar(255), googleName)
        .query("UPDATE Users SET FullName = @FullName, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId");

      // Log đăng ký Google
      await pool
        .request()
        .input("UserId", sql.Int, userId)
        .input("Action", sql.NVarChar(50), "Register_Google")
        .input("Meta", sql.NVarChar(255), `Email=${email}`)
        .query("INSERT INTO AuditLogs (UserId, Action, Meta) VALUES (@UserId, @Action, @Meta)");
    } else {
      // === ĐĂNG NHẬP LẠI ===
      userId = checkUser.recordset[0].UserId;
      roleId = checkUser.recordset[0].RoleId || 2;
    }

    // Lấy thông tin user (đảm bảo có FullName mới nhất)
    const userQuery = await pool
      .request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT Username, FullName, Email, Phone, RoleId, IsActive
        FROM Users WHERE UserId = @UserId
      `);

    const userInfo = userQuery.recordset[0] || {};

    // Cập nhật FullName nếu lần đầu chưa có
    if (!userInfo.FullName && googleName !== "Người dùng Google") {
      await pool
        .request()
        .input("UserId", sql.Int, userId)
        .input("FullName", sql.NVarChar(255), googleName)
        .query("UPDATE Users SET FullName = @FullName, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId");
      userInfo.FullName = googleName;
    }

    // Tạo JWT (dùng userId để tránh lỗi mssql như trước)
    const jwtToken = jwt.sign(
      { id: userId, email, role: roleId },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    return NextResponse.json({
      message: "Đăng nhập Google thành công!",
      user: {
        userId,
        username: userInfo.Username || usernameBase,
        fullname: userInfo.FullName || googleName,
        email: userInfo.Email || email,
        phone: userInfo.Phone || "",
        role: roleId,
        isActive: userInfo.IsActive ?? true,
      },
      token: jwtToken,
    });
  } catch (error: any) {
    console.error("Google login error:", error);
    const message =
      error?.originalError?.info?.message ||
      error?.message ||
      "Lỗi máy chủ khi đăng nhập bằng Google";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// CORS
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}