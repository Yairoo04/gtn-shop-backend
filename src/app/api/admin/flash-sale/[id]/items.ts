// API: /api/admin/flash-sale/[id]/items
import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '~/app/lib/db';

// GET: Lấy danh sách sản phẩm flash sale của campaign
export async function GET(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  try {
    const { params } = await contextPromise;
    const campaignId = Number(params.id);
    const pool = await getPool();
    const result = await pool.request()
      .input('CampaignId', sql.Int, campaignId)
      .query(`
        SELECT fsi.Id, fsi.ProductId, p.Name, p.ImageUrl, p.Price, fsi.FlashPrice, fsi.StockLimit, fsi.DisplayOrder
        FROM FlashSaleItems fsi
        JOIN Products p ON p.ProductId = fsi.ProductId
        WHERE fsi.CampaignId = @CampaignId
        ORDER BY ISNULL(fsi.DisplayOrder, 9999), p.ProductId
      `);
    return NextResponse.json({ success: true, items: result.recordset });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// POST: Thêm sản phẩm vào flash sale
export async function POST(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  try {
    const { params } = await contextPromise;
    const campaignId = Number(params.id);
    const { ProductId, FlashPrice } = await req.json();
    const pool = await getPool();
    await pool.request()
      .input('CampaignId', sql.Int, campaignId)
      .input('ProductId', sql.Int, ProductId)
      .input('FlashPrice', sql.Decimal(18,2), FlashPrice)
      .query(`
        INSERT INTO FlashSaleItems (CampaignId, ProductId, FlashPrice)
        VALUES (@CampaignId, @ProductId, @FlashPrice)
      `);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
