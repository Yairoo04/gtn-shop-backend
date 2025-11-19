// app/api/flash-sale/route.ts
import { NextResponse } from "next/server";
import sql from "mssql";
import { getPool } from "~/app/lib/db";

export async function GET() {
  try {
    const pool = await getPool();

    // Lấy campaign đang active (chỉ 1 cái)
    const campaignResult = await pool.request().query(`
      SELECT TOP 1 Id, Code, Title, StartTime, EndTime, BannerImageUrl
      FROM FlashSaleCampaigns
      WHERE IsActive = 1 
        AND StartTime <= GETUTCDATE()
        AND EndTime >= GETUTCDATE()
      ORDER BY EndTime ASC
    `);

    if (campaignResult.recordset.length === 0) {
      return NextResponse.json({ campaign: null, products: [] });
    }

    const campaign = campaignResult.recordset[0];

    // Lấy sản phẩm của campaign đó
    const productsResult = await pool.request()
      .input("CampaignId", sql.Int, campaign.Id)
      .query(`
        SELECT 
          p.ProductId,
          p.Name,
          p.Price,
          ISNULL(f.FlashPrice, p.Price) AS FlashPrice,
          p.ImageUrl,
          ISNULL(f.StockLimit, p.Stock) AS StockLimit,
          f.DisplayOrder
        FROM FlashSaleItems f
        JOIN Products p ON f.ProductId = p.ProductId
        WHERE f.CampaignId = @CampaignId AND p.IsPublished = 1
        ORDER BY ISNULL(f.DisplayOrder, 9999), p.ProductId
      `);

    return NextResponse.json({
      campaign,
      products: productsResult.recordset
    });

  } catch (error) {
    console.error("API /api/flash-sale error:", error);
    return NextResponse.json({ campaign: null, products: [] }, { status: 500 });
  }
}