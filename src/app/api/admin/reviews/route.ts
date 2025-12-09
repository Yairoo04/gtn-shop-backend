import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import sql from "mssql";




export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  // Truy vấn tất cả đánh giá, join với sản phẩm và user
  const query = `
    SELECT r.ReviewId, r.ProductId, p.Name AS ProductName, r.UserId, u.FullName, u.Username, r.Rating, r.Comment, r.ReplyContent, r.CreatedAt, r.IsActive
    FROM ProductReviews r
    LEFT JOIN Products p ON r.ProductId = p.ProductId
    LEFT JOIN Users u ON r.UserId = u.UserId
    WHERE (
      p.Name LIKE @search OR
      u.FullName LIKE @search OR
      u.Username LIKE @search OR
      r.Comment LIKE @search
    )
    ORDER BY r.CreatedAt DESC
  `;
  const pool = await getPool();
  const result = await pool.request()
    .input('search', sql.NVarChar, `%${search}%`)
    .query(query);
  return NextResponse.json({ data: result.recordset });
}

// PUT: Ẩn/hiện review
export async function PUT(req: Request) {
  const body = await req.json();
  const { reviewId, action } = body;
  if (!reviewId || !action) {
    return NextResponse.json({ success: false, error: "Thiếu reviewId hoặc action" }, { status: 400 });
  }
  const pool = await getPool();
  if (action === "toggleActive") {
    // Đảo trạng thái IsActive
    await pool.request()
      .input("ReviewId", sql.Int, reviewId)
      .query(`UPDATE ProductReviews SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE ReviewId = @ReviewId`);
    return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái đánh giá" });
  }
  if (action === "reply" && body.replyContent !== undefined) {
    await pool.request()
      .input("ReviewId", sql.Int, reviewId)
      .input("ReplyContent", sql.NVarChar(1000), body.replyContent)
      .query(`UPDATE ProductReviews SET ReplyContent = @ReplyContent WHERE ReviewId = @ReviewId`);
    return NextResponse.json({ success: true, message: "Đã lưu trả lời" });
  }
  return NextResponse.json({ success: false, error: "Action không hợp lệ" }, { status: 400 });
}

// DELETE: Xóa review
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const reviewId = searchParams.get("reviewId");
  if (!reviewId) {
    return NextResponse.json({ success: false, error: "Thiếu reviewId" }, { status: 400 });
  }
  const pool = await getPool();
  await pool.request()
    .input("ReviewId", sql.Int, reviewId)
    .query(`DELETE FROM ProductReviews WHERE ReviewId = @ReviewId`);
  return NextResponse.json({ success: true, message: "Đã xóa đánh giá" });
}
