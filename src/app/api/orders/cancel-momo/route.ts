import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";
import { verifyToken } from "~/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    // Lấy token từ Header
    const token = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Update DB
    const pool = await getPool();

    await pool
      .request()
      .input("orderId", sql.Int, orderId)
      .query(`
        UPDATE Orders
        SET StatusId = 6
        WHERE order_id = @orderId
      `);

    return NextResponse.json({
      message: `Order #${orderId} cancelled successfully`,
    });
  } catch (err) {
    console.error("CANCEL MOMO ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// CORS
export const OPTIONS = () => NextResponse.json({}, { status: 204 });
