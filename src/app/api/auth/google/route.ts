import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
    const name = payload.name || "Người dùng Google";

    const pool = await getPool();

    // Kiểm tra user đã tồn tại
    const checkUser = await pool
      .request()
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT UserId, RoleId FROM Users WHERE Email = @Email");

    let userId, roleId;

    if (checkUser.recordset.length === 0) {
      const tempPassword = "GoogleAuth@123"; // thỏa điều kiện RegisterUser
      const result = await pool
        .request()
        .input("Username", sql.NVarChar(100), name)
        .input("Email", sql.NVarChar(255), email)
        .input("Password", sql.NVarChar(4000), tempPassword)
        .input("Phone", sql.NVarChar(50), null)
        // .input("RoleId", sql.Int, 2) // tùy chọn
        .execute("RegisterUser");

      userId = result.recordset?.[0]?.NewUserId || null;
      roleId = 2; // "customer"
    } else {
      userId = checkUser.recordset[0].UserId;
      roleId = checkUser.recordset[0].RoleId || 2;
    }

    // Sinh JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Thiếu JWT_SECRET trong môi trường");

    const jwtToken = jwt.sign({ id: userId, email, role: roleId }, secret, { expiresIn: "2d" });

    return NextResponse.json({
      message: "Đăng nhập Google thành công!",
      user: { id: userId, name, email, role: roleId },
      token: jwtToken,
    });
  } catch (err: any) {
    console.error("Google login error:", err);
    const msg = err?.originalError?.info?.message || err?.message || "Không thể xác thực Google";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

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
