// app/api/recentviewProducts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
    getRecentViewById,
    updateRecentView,
    deleteRecentView,
} from '../../../models/recentViewProduct.model';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const recentViewId = parseInt(id, 10);
    if (isNaN(recentViewId)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const recentView = await getRecentViewById(recentViewId);
        if (!recentView) {
            return NextResponse.json({ success: false, error: 'Recent view not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: recentView });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch recent view' },
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
    const recentViewId = parseInt(id, 10);
    if (isNaN(recentViewId)) {
        return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    try {
        const success = await deleteRecentView(recentViewId);
        if (!success) {
            return NextResponse.json({ success: false, error: 'Recent view not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, message: 'Recent view deleted' });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete recent view' },
            { status: 500 }
        );
    }
}

async function handleUpdate(
    request: NextRequest,
    params: Promise<{ id: string }>
) {
    const { id } = await params;
    const recentViewId = parseInt(id, 10);
    if (isNaN(recentViewId)) {
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
        const updatedRecentView = await updateRecentView(recentViewId, body);
        if (!updatedRecentView) {
            return NextResponse.json(
                { success: false, error: 'Recent view not found or no changes applied' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Recent view updated successfully',
            data: updatedRecentView,
        });
    } catch (error: any) {
        console.error('Update error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update recent view' },
            { status: 500 }
        );
    }
}