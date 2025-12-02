// API: /api/admin/flash-sale/[id]/items/[itemId]
import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '~/app/lib/db';

// Xóa sản phẩm khỏi flash sale
export async function DELETE(req: NextRequest, { params }: { params: { id: string, itemId: string } }) {
  try {
    const campaignId = Number(params.id);
    const itemId = Number(params.itemId);
    const pool = await getPool();
    await pool.request()
      .input('CampaignId', sql.Int, campaignId)
      .input('Id', sql.Int, itemId)
      .query('DELETE FROM FlashSaleItems WHERE CampaignId = @CampaignId AND Id = @Id');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// Cập nhật giá flash sale
export async function PUT(req: NextRequest, { params }: { params: { id: string, itemId: string } }) {
  try {
    const campaignId = Number(params.id);
    const itemId = Number(params.itemId);
    const { FlashPrice } = await req.json();
    const pool = await getPool();
    await pool.request()
      .input('CampaignId', sql.Int, campaignId)
      .input('Id', sql.Int, itemId)
      .input('FlashPrice', sql.Decimal(18,2), FlashPrice)
      .query('UPDATE FlashSaleItems SET FlashPrice = @FlashPrice WHERE CampaignId = @CampaignId AND Id = @Id');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
