// API: /api/admin/flash-sale/[id]/items/[itemId]
import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '~/app/lib/db';

// PUT: Sửa sản phẩm flash sale
export async function PUT(req: NextRequest, contextPromise: Promise<{ params: { id: string, itemId: string } }>) {
  try {
    const { params } = await contextPromise;
    const itemId = Number(params.itemId);
    const { FlashPrice } = await req.json();
    const pool = await getPool();
    await pool.request()
      .input('Id', sql.Int, itemId)
      .input('FlashPrice', sql.Decimal(18,2), FlashPrice)
      .query(`
        UPDATE FlashSaleItems
        SET FlashPrice = @FlashPrice
        WHERE Id = @Id
      `);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// DELETE: Xóa sản phẩm khỏi flash sale
export async function DELETE(req: NextRequest, contextPromise: Promise<{ params: { id: string, itemId: string } }>) {
  try {
    const { params } = await contextPromise;
    const itemId = Number(params.itemId);
    const pool = await getPool();
    await pool.request()
      .input('Id', sql.Int, itemId)
      .query('DELETE FROM FlashSaleItems WHERE Id = @Id');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
