// src/app/api/flash-sale/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '~/app/lib/db';

// GET /api/flash-sale/[code]
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }, // params là Promise theo kiểu bạn đang dùng
) {
  // BẮT BUỘC phải await params
  const { code } = await ctx.params;

  if (!code) {
    return NextResponse.json(
      { success: false, message: 'Missing flash sale code' },
      { status: 400 },
    );
  }

  try {
    const pool = await getPool();

    // 1. Lấy campaign đang active theo code
    const campaignResult = await pool
      .request()
      .input('Code', sql.NVarChar, code)
      .query(`
        DECLARE @Now DATETIME = GETUTCDATE();

        SELECT TOP 1
          Id,
          Code,
          Title,
          StartTime,
          EndTime,
          BannerImageUrl,
          IsActive
        FROM FlashSaleCampaigns
        WHERE Code = @Code
          AND IsActive = 1
          AND StartTime <= @Now
          AND EndTime   >= @Now;
      `);

    if (!campaignResult.recordset.length) {
      return NextResponse.json(
        { success: false, message: 'Campaign not found or not active' },
        { status: 404 },
      );
    }

    const campaign = campaignResult.recordset[0];

    // 2. Lấy danh sách sản phẩm thuộc campaign + FlashPrice + rating
    const itemsResult = await pool
      .request()
      .input('CampaignId', sql.Int, campaign.Id)
      .query(`
        SELECT 
          p.ProductId,
          p.Name,
          p.Description,
          p.CategoryId,
          p.Price,
          p.DiscountPrice,
          p.ImageUrl,
          -- Stock hiển thị cho FE: ưu tiên StockLimit, fallback Stock gốc
          ISNULL(fsi.StockLimit, p.Stock) AS Stock,
          p.CreatedAt,
          p.UpdatedAt,

          -- Thông tin flash sale
          fsi.FlashPrice,
          fsi.StockLimit,
          fsi.DisplayOrder,

          -- Rating từ view vProductRatingSummary
          ISNULL(r.AverageRating, 0) AS AverageRating,
          ISNULL(r.TotalReviews, 0) AS TotalReviews
        FROM FlashSaleItems fsi
        JOIN Products p 
          ON p.ProductId = fsi.ProductId
        LEFT JOIN dbo.vProductRatingSummary r
          ON r.ProductId = p.ProductId
        WHERE fsi.CampaignId = @CampaignId
          AND p.IsPublished = 1
        ORDER BY 
          ISNULL(fsi.DisplayOrder, 9999), 
          p.ProductId;
      `);

    return NextResponse.json(
      {
        success: true,
        campaign,
        products: itemsResult.recordset,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('GET /api/flash-sale/[code] error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 },
    );
  }
}
