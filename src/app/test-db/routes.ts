import { NextResponse } from 'next/server';
import dbPool from '../lib/db';

export async function GET() {
  try {
    const request = dbPool.request();
    const result = await request.query('SELECT 1 AS test');
    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error) {
    let message = 'Unknown error';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
