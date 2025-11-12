import { NextRequest, NextResponse } from 'next/server';
import { getAddresses, createAddress, updateAddress, deleteAddress } from '../../controllers/addressController';

export async function GET(req: NextRequest) {
  try {
    const addresses = await getAddresses(req);
    return NextResponse.json(addresses);
  } catch (error: any) {
    console.error('GET /api/address Error:', error.message);
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const address = await createAddress(req);
    return NextResponse.json(address, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/address Error:', error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const address = await updateAddress(req);
    return NextResponse.json(address);
  } catch (error: any) {
    console.error('PUT /api/address Error:', error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await deleteAddress(req, req.nextUrl.searchParams);
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('DELETE /api/address Error:', error.message);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}