import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";
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
      return NextResponse.json(
        { message: "Không nhận được email từ Google" },
        { status: 400 }
      );
    }

    const email = payload.email;
    const name = payload.name || "Người dùng Google";

    // Kết nối DB
    const pool = await getPool();
    const request = pool.request();

    // Kiểm tra xem user đã tồn tại chưa
    const checkUser = await request
      .input("Email", sql.NVarChar(255), email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    if (checkUser.recordset.length === 0) {
      // Nếu chưa có, thì đăng ký mới
      const registerReq = pool.request();
      registerReq.input("Username", sql.NVarChar(255), name);
      registerReq.input("Email", sql.NVarChar(255), email);
      registerReq.input("Password", sql.NVarChar(255), "GoogleAuth@123");
      registerReq.input("RoleId", sql.Int, 2);
      await registerReq.execute("RegisterUser");
    }

    return NextResponse.json({
      user: { name, email },
      message: "Đăng nhập Google thành công!",
    });
  } catch (error: unknown) {
    console.error("Google login error:", error);
    const message =
      error instanceof Error ? error.message : "Không thể xác thực Google";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// OPTIONS fix CORS
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
