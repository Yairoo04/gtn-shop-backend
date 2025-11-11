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
    const googleName = payload.name || "Người dùng Google"; // Tên từ Google
    const username = email.split("@")[0]; // Dùng email prefix làm Username

    const pool = await getPool();

    // Kiểm tra user đã tồn tại
    const checkUser = await pool
      .request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT UserId, RoleId FROM Users WHERE Email = @Email");

    let userId: number;
    let roleId: number | string = 2;

    if (checkUser.recordset.length === 0) {
      // === ĐĂNG KÝ MỚI – KHÔNG DÙNG RegisterUser SP ===
      const tempPassword = "GoogleAuth@123"; // Đáp ứng mật khẩu mạnh

      // Kiểm tra username trùng
      const checkUsername = await pool
        .request()
        .input("Username", sql.NVarChar(100), username)
        .query("SELECT 1 FROM Users WHERE Username = @Username");

      const finalUsername = checkUsername.recordset.length > 0
        ? `${username}_${Date.now().toString().slice(-6)}`
        : username;

      // Tạo salt + hash password
      const salt = await pool.request().query("SELECT CRYPT_GEN_RANDOM(32) AS Salt");
      const saltBin = salt.recordset[0].Salt;
      const pwBin = Buffer.from(tempPassword);
      const hashResult = await pool
        .request()
        .input("salt", sql.VarBinary, saltBin)
        .input("pw", sql.VarBinary, pwBin)
        .query("SELECT HASHBYTES('SHA2_512', @salt + @pw) AS Hash");
      const hash = hashResult.recordset[0].Hash;

      // Insert user mới
      const insertResult = await pool
        .request()
        .input("Username", sql.NVarChar(100), finalUsername)
        .input("Email", sql.NVarChar(255), email)
        .input("Phone", sql.NVarChar(50), null)
        .input("PasswordSalt", sql.VarBinary, saltBin)
        .input("PasswordHash", sql.VarBinary, hash)
        .input("RoleId", sql.Int, 2)
        .input("CustomerTypeId", sql.Int, 1)
        .input("FullName", sql.NVarChar(255), googleName) // Lưu tên thật
        .query(`
          INSERT INTO Users (
            Username, Email, Phone, PasswordSalt, PasswordHash,
            RoleId, CustomerTypeId, FullName, CreatedAt, UpdatedAt
          )
          OUTPUT INSERTED.UserId
          VALUES (
            @Username, @Email, @Phone, @PasswordSalt, @PasswordHash,
            @RoleId, @CustomerTypeId, @FullName, SYSUTCDATETIME(), SYSUTCDATETIME()
          )
        `);

      userId = insertResult.recordset[0].UserId;

      // Ghi log
      await pool
        .request()
        .input("UserId", sql.Int, userId)
        .input("Action", sql.NVarChar(50), "Register")
        .input("Meta", sql.NVarChar(255), `Email=${email}`)
        .query("INSERT INTO AuditLogs (UserId, Action, Meta) VALUES (@UserId, @Action, @Meta)");
    } else {
      // === ĐĂNG NHẬP LẠI ===
      userId = checkUser.recordset[0].UserId;
      roleId = checkUser.recordset[0].RoleId || 2;
    }

    // Lấy thông tin đầy đủ từ DB (giống login thường)
    const userQuery = await pool
      .request()
      .input("UserId", sql.Int, userId)
      .query(`
        SELECT 
          Username, FullName, Email, Phone, RoleId, IsActive
        FROM Users 
        WHERE UserId = @UserId
      `);

    const userInfo = userQuery.recordset[0] || {};

    // Cập nhật FullName nếu chưa có (từ Google)
    if (!userInfo.FullName && googleName !== "Người dùng Google") {
      await pool
        .request()
        .input("UserId", sql.Int, userId)
        .input("FullName", sql.NVarChar(255), googleName)
        .query("UPDATE Users SET FullName = @FullName, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId");

      userInfo.FullName = googleName;
    }

    // Tạo JWT giống hệt login thường
    const jwtToken = jwt.sign(
      { id: userId, email, role: roleId },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    // Trả về giống hệt login thường
    return NextResponse.json({
      message: "Đăng nhập Google thành công!",
      user: {
        id: userId,
        username: userInfo.Username || username,
        fullname: userInfo.FullName || googleName, // Ưu tiên DB → Google
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