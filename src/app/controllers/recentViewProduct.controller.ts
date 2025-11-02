// src/controllers/recentViewProduct.controller.ts

import { NextRequest, NextResponse } from 'next/server';
import { addRecentView, getRecentViewProducts } from '../models/recentViewProduct.model';

// POST: /api/recentviewProducts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return NextResponse.json(
        { success: false, error: 'userId and productId are required' },
        { status: 400 }
      );
    }

    await addRecentView(userId, productId);
    return NextResponse.json({ success: true, message: 'Recent view added' });
  } catch (error: any) {
    console.error('Add recent view error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add' },
      { status: 500 }
    );
  }
}

// GET: /api/recentviewProducts?userId=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = parseInt(searchParams.get('userId') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!userId || userId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid userId is required' },
        { status: 400 }
      );
    }

    const products = await getRecentViewProducts(userId, limit);
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Get recent views error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch' },
      { status: 500 }
    );
  }
}