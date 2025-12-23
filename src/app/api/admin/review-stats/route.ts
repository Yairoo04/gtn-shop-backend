import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'day';
    const pool = await getPool();
    let query = '';
    if (view === 'day') {
      // Số lượt đánh giá 10 ngày gần nhất
      query = `
        ;WITH Days AS (
          SELECT CAST(CAST(GETDATE() AS date) AS datetime) AS d, 0 AS n
          UNION ALL
          SELECT DATEADD(day, -1, d), n + 1 FROM Days WHERE n < 9
        )
        SELECT 
          CAST(d AS date) AS period,
          ISNULL(COUNT(r.ReviewId), 0) AS reviewCount
        FROM Days ds
        LEFT JOIN ProductReviews r
          ON CAST(r.CreatedAt AS date) = CAST(ds.d AS date)
        GROUP BY CAST(d AS date)
        ORDER BY period ASC
        OPTION (MAXRECURSION 100);
      `;
    } else if (view === 'month') {
      // Số lượt đánh giá theo tháng (12 tháng gần nhất)
      query = `
        SELECT 
          DATEPART(YEAR, CreatedAt) as year,
          DATEPART(MONTH, CreatedAt) as month,
          CONCAT(N'Tháng ', FORMAT(DATEPART(MONTH, CreatedAt), '00'), N'/', DATEPART(YEAR, CreatedAt)) as period,
          COUNT(ReviewId) as reviewCount
        FROM ProductReviews
        WHERE CreatedAt >= DATEADD(month, -12, GETDATE())
        GROUP BY DATEPART(YEAR, CreatedAt), DATEPART(MONTH, CreatedAt)
        ORDER BY year ASC, month ASC
      `;
    } else {
      return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
    }
    const result = await pool.request().query(query);
    return NextResponse.json({
      view,
      data: result.recordset
    });
  } catch (error: any) {
    console.error('Review Stats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review stats', details: error.message },
      { status: 500 }
    );
  }
}