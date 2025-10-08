import { NextResponse } from 'next/server';
import { getPool } from '../../lib/db';

export async function GET() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS test');
    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error) {
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
