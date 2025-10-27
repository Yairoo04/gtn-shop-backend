import { NextRequest, NextResponse } from 'next/server';
import { getCustomersAdmin, getRevenueReportAdmin } from '../../controllers/admin.controller';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.endsWith('/customers')) {
    return getCustomersAdmin(req);
  } else if (path.endsWith('/revenue-report')) {
    return getRevenueReportAdmin(req);
  }
  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}