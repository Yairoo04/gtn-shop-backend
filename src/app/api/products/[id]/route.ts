// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
    getProductById,
    updateProduct,
    deleteProduct as deleteProductModel,
} from '~/app/models/product.model';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const product = await getProductById(productId);
        if (!product) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: product });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch product' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleUpdate(request, params);
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return handleUpdate(request, params);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const success = await deleteProductModel(productId);
        if (!success) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Product deleted' });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete product' },
            { status: 500 }
        );
    }
}

async function handleUpdate(
    request: NextRequest,
    params: Promise<{ id: string }>
) {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON body. Please send valid JSON.' },
            { status: 400 }
        );
    }

    if (Object.keys(body).length === 0) {
        return NextResponse.json(
            { success: false, error: 'No fields provided to update' },
            { status: 400 }
        );
    }

    try {
        const updatedProduct = await updateProduct(productId, body);
        if (!updatedProduct) {
            return NextResponse.json(
                { success: false, error: 'Product not found or no changes applied' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct,
        });
    } catch (error: any) {
        console.error('Update error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update product' },
            { status: 500 }
        );
    }
}