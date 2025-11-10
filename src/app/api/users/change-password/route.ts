import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import sql from "mssql";
import { getPool } from "../../../lib/db";

// ==========================
// PATCH: Đổi mật khẩu
// ==========================
export async function PATCH(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { oldPassword, newPassword } = await req.json();
    if (!oldPassword || !newPassword) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Thiếu mật khẩu cũ hoặc mới" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const pool = await getPool();
    const request = pool
      .request()
      .input("UserId", sql.Int, decoded.id)
      .input("OldPassword", sql.NVarChar(4000), oldPassword)
      .input("NewPassword", sql.NVarChar(4000), newPassword);

    await request.execute("dbo.ChangePassword");

    return new NextResponse(
      JSON.stringify({ success: true, message: "Đổi mật khẩu thành công" }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Error changing password:", error);

    const sqlError =
      error?.originalError?.info?.message ||
      error?.message ||
      "Lỗi khi đổi mật khẩu";

    return new NextResponse(
      JSON.stringify({ success: false, message: sqlError }),
      { status: 400, headers: corsHeaders }
    );
  }
}

// ==========================
// OPTIONS: cho phép CORS preflight
// ==========================
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
