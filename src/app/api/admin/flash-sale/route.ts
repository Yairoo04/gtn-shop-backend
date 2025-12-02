// API: /api/admin/flash-sale
import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '~/app/lib/db';

// GET: Lấy danh sách campaign flash sale
export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM FlashSaleCampaigns ORDER BY EndTime DESC
    `);
    return NextResponse.json({ success: true, campaigns: result.recordset });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

// POST: Thêm campaign mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { Code, Title, StartTime, EndTime, BannerImageUrl, IsActive } = body;
    const pool = await getPool();
    await pool.request()
      .input('Code', sql.NVarChar, Code)
      .input('Title', sql.NVarChar, Title)
      .input('StartTime', sql.DateTime, StartTime)
      .input('EndTime', sql.DateTime, EndTime)
      .input('BannerImageUrl', sql.NVarChar, BannerImageUrl)
      .input('IsActive', sql.Bit, IsActive)
      .query(`
        INSERT INTO FlashSaleCampaigns (Code, Title, StartTime, EndTime, BannerImageUrl, IsActive, CreatedAt)
        VALUES (@Code, @Title, @StartTime, @EndTime, @BannerImageUrl, @IsActive, GETDATE())
      `);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
