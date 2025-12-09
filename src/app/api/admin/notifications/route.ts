import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";

// GET: Lấy danh sách thông báo chưa đọc cho admin
export async function GET(req: NextRequest) {
  const pool = await getPool();
  const result = await pool.request()
    .query(`SELECT NotificationId, Type, Message, IsRead, CreatedAt FROM Notifications WHERE IsRead = 0 ORDER BY CreatedAt DESC`);
  return NextResponse.json({ data: result.recordset });
}

// PUT: Đánh dấu đã đọc thông báo
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { notificationId } = body;
  if (!notificationId) {
    return NextResponse.json({ success: false, error: "Thiếu notificationId" }, { status: 400 });
  }
  const pool = await getPool();
  await pool.request()
    .input("NotificationId", sql.Int, notificationId)
    .query(`UPDATE Notifications SET IsRead = 1 WHERE NotificationId = @NotificationId`);
  return NextResponse.json({ success: true });
}
