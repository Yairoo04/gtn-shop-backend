// cart.controller.ts (New file for cart operations)
import { NextRequest, NextResponse } from 'next/server';
import { addToCart, viewCart } from '../models/cart.model';
import { verifyToken } from './user.controller';

export const addToCartController = async (req: NextRequest) => {
    try {
      const token = req.headers.get('Authorization')?.split(' ')[1];
      const user = token ? await verifyToken(token) : null;
  
      const body = await req.json();
      const { cartId, productId, quantity = 1 } = body;
      if (!productId) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
  
      const newCartId = await addToCart(cartId, user?.userId ?? null, productId, quantity);
      return NextResponse.json({ success: true, data: { cartId: newCartId } });
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Failed to add to cart' }, { status: 500 });
    }
  };

export const viewCartController = async (req: NextRequest) => {
  try {
    const cartId = req.nextUrl.searchParams.get('cartId');
    if (!cartId) return NextResponse.json({ error: 'Missing cart ID' }, { status: 400 });

    const cartItems = await viewCart(cartId);
    return NextResponse.json({ success: true, data: cartItems });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to view cart' }, { status: 500 });
  }
};