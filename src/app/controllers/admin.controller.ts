// admin.controller.ts (New file for admin-specific operations)
import { NextRequest, NextResponse } from 'next/server';
import { getCustomers, getRevenueReport } from '../models/admin.model';
import { verifyToken } from './user.controller';

export const getCustomersAdmin = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const customers = await getCustomers();
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
  }
};

export const getRevenueReportAdmin = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const period = req.nextUrl.searchParams.get('period') || 'day';
    const report = await getRevenueReport(period);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch revenue report' }, { status: 500 });
  }
};