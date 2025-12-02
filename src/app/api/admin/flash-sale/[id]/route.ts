// API: /api/admin/flash-sale/[id]
import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '~/app/lib/db';

// PUT: Sửa campaign
export async function PUT(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  try {
    const body = await req.json();
    const { Code, Title, StartTime, EndTime, BannerImageUrl, IsActive } = body;
    const { params } = await contextPromise;
    const id = params.id;
    const pool = await getPool();
    await pool.request()
      .input('Id', sql.Int, Number(id))
      .input('Code', sql.NVarChar, Code)
      .input('Title', sql.NVarChar, Title)
      .input('StartTime', sql.DateTime, StartTime)
      .input('EndTime', sql.DateTime, EndTime)
      .input('BannerImageUrl', sql.NVarChar, BannerImageUrl)
      .input('IsActive', sql.Bit, IsActive)
      .query(`
        UPDATE FlashSaleCampaigns
        SET Code=@Code, Title=@Title, StartTime=@StartTime, EndTime=@EndTime, BannerImageUrl=@BannerImageUrl, IsActive=@IsActive
        WHERE Id=@Id
      `);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// DELETE: Xóa campaign
export async function DELETE(req: NextRequest, contextPromise: Promise<{ params: { id: string } }>) {
  try {
    const { params } = await contextPromise;
    const id = params.id;
    const pool = await getPool();
    await pool.request()
      .input('Id', sql.Int, Number(id))
      .query('DELETE FROM FlashSaleCampaigns WHERE Id=@Id');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
