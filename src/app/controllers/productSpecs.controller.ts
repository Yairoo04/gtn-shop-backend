// src/controllers/productSpecs.controller.ts (New file - API handlers for /api/ProductSpecs)

import { NextRequest, NextResponse } from 'next/server';
import {
  getSpecsByProductId,
  addSpecs,
  updateSpecs,
  deleteSpecsByProductId,
} from '../models/productSpecs.model';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdStr = searchParams.get('productId');

    if (!productIdStr) {
      return NextResponse.json({ success: false, error: 'Missing productId' }, { status: 400 });
    }

    const productId = parseInt(productIdStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }

    const specs = await getSpecsByProductId(productId);
    if (specs.length === 0) {
      return NextResponse.json({ success: true, data: [], message: 'No specs found' });
    }

    // Map to alias format (component, detail, warranty)
    const formattedSpecs = specs.map(spec => ({
      component: spec.SpecName,
      detail: spec.SpecValue,
      warranty: spec.Warranty,
    }));

    return NextResponse.json({ success: true, data: formattedSpecs });
  } catch (error: any) {
    console.error('ProductSpecs GET error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch specs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdStr = searchParams.get('productId');

    if (!productIdStr) {
      return NextResponse.json({ success: false, error: 'Missing productId' }, { status: 400 });
    }

    const productId = parseInt(productIdStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      return NextResponse.json({ success: false, error: 'Invalid JSON body: ' + parseError.message }, { status: 400 });
    }

    if (!body.specs || !Array.isArray(body.specs)) {
      return NextResponse.json({ success: false, error: 'Body must contain "specs" as an array' }, { status: 400 });
    }

    await addSpecs(productId, body.specs);
    return NextResponse.json({ success: true, message: 'Specs added successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('ProductSpecs POST error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to add specs' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdStr = searchParams.get('productId');

    if (!productIdStr) {
      return NextResponse.json({ success: false, error: 'Missing productId' }, { status: 400 });
    }

    const productId = parseInt(productIdStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message);
      return NextResponse.json({ success: false, error: 'Invalid JSON body: ' + parseError.message }, { status: 400 });
    }

    if (!body.specs || !Array.isArray(body.specs)) {
      return NextResponse.json({ success: false, error: 'Body must contain "specs" as an array' }, { status: 400 });
    }

    await updateSpecs(productId, body.specs);
    return NextResponse.json({ success: true, message: 'Specs updated successfully' });
  } catch (error: any) {
    console.error('ProductSpecs PUT error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update specs' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productIdStr = searchParams.get('productId');

    if (!productIdStr) {
      return NextResponse.json({ success: false, error: 'Missing productId' }, { status: 400 });
    }

    const productId = parseInt(productIdStr, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }

    const success = await deleteSpecsByProductId(productId);
    if (!success) {
      return NextResponse.json({ success: false, message: 'No specs found to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Specs deleted successfully' });
  } catch (error: any) {
    console.error('ProductSpecs DELETE error:', error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete specs' }, { status: 500 });
  }
}