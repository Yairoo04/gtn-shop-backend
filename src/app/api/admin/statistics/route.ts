import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'day';

    const pool = await getPool();

    let query = '';
    
    if (view === 'day') {
      // Doanh thu 10 ngày gần nhất (liên tiếp, gồm cả ngày không có đơn)
      query = `
        ;WITH Days AS (
          SELECT CAST(CAST(GETDATE() AS date) AS datetime) AS d, 0 AS n
          UNION ALL
          SELECT DATEADD(day, -1, d), n + 1 FROM Days WHERE n < 9
        )
        SELECT 
          CAST(d AS date) AS period,
          ISNULL(SUM(o.TotalAmount), 0) AS revenue
        FROM Days ds
        LEFT JOIN Orders o
          ON CAST(o.CreatedAt AS date) = CAST(ds.d AS date)
         AND o.Status IN (N'Completed', N'Delivered')
        GROUP BY CAST(d AS date)
        ORDER BY period ASC
        OPTION (MAXRECURSION 100);
      `;
    } else if (view === 'week') {
      // Doanh thu theo "tuần thứ mấy trong tháng" (12 tuần gần nhất)
      // Tuần tính từ Thứ 2 (DATEFIRST = 1)
      query = `
        SET DATEFIRST 1;
        WITH Raw AS (
          SELECT 
            YEAR(CreatedAt) AS yr,
            MONTH(CreatedAt) AS mn,
            1 + DATEDIFF(week, DATEFROMPARTS(YEAR(CreatedAt), MONTH(CreatedAt), 1), CreatedAt) AS wom,
            TotalAmount AS amt
          FROM Orders
          WHERE Status IN (N'Completed', N'Delivered')
            AND CreatedAt >= DATEADD(week, -12, GETDATE())
        ), Agg AS (
          SELECT yr, mn, wom, SUM(amt) AS revenue
          FROM Raw
          GROUP BY yr, mn, wom
        )
        SELECT 
          yr AS year,
          mn AS month,
          wom AS week,
          CONCAT(N'Tuần ', wom, N'/tháng ', FORMAT(mn, '00')) AS period,
          revenue
        FROM Agg
        ORDER BY year ASC, month ASC, week ASC;
      `;
    } else {
      // Doanh thu theo từng tháng (12 tháng gần nhất)
      query = `
        SELECT 
          DATEPART(YEAR, CreatedAt) as year,
          DATEPART(MONTH, CreatedAt) as month,
          CONCAT(N'Tháng ', FORMAT(DATEPART(MONTH, CreatedAt), '00'), N'/', DATEPART(YEAR, CreatedAt)) as period,
          ISNULL(SUM(TotalAmount), 0) as revenue
        FROM Orders
        WHERE Status IN (N'Completed', N'Delivered')
          AND CreatedAt >= DATEADD(month, -12, GETDATE())
        GROUP BY DATEPART(YEAR, CreatedAt), DATEPART(MONTH, CreatedAt)
        ORDER BY year ASC, month ASC
      `;
    }

    const result = await pool.request().query(query);

    return NextResponse.json({
      view,
      data: result.recordset
    });
  } catch (error: any) {
    console.error('Statistics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error.message },
      { status: 500 }
    );
  }
}
