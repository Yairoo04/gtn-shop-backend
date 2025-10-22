import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByUserId, createOrder as createOrderModel, cancelOrder, getAllOrders, getOrderDetails, updateOrderStatus, placeOrderFromCart } from '../models/order.model';
import { verifyToken } from './user.controller'; // Reuse verifyToken from user.controller

export const getOrders = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const orders = await getOrdersByUserId(user.userId);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
};

export const createOrder = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    if (!body.product_id || !body.quantity || !body.total_price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newOrder = await createOrderModel({ ...body, user_id: user.userId });
    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
};

export const placeOrderFromCartController = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    const user = token ? await verifyToken(token) : null;

    const body = await req.json();
    const { cartId, recipientName, recipientPhone, recipientAddress } = body;
    if (!cartId || !recipientName || !recipientPhone || !recipientAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderId = await placeOrderFromCart(cartId, user?.userId ?? null, recipientName, recipientPhone, recipientAddress);
    return NextResponse.json({ success: true, data: { orderId } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to place order from cart' }, { status: 500 });
  }
};

export const cancelOrderController = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { orderId } = body;
    if (!orderId) return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });

    await cancelOrder(orderId, user.userId);
    return NextResponse.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
  }
};

export const getAllOrdersAdmin = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orders = await getAllOrders();
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch all orders' }, { status: 500 });
  }
};

export const getOrderDetailsAdmin = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orderId = parseInt(req.nextUrl.searchParams.get('orderId') || '0', 10);
    if (!orderId) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });

    const order = await getOrderDetails(orderId);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch order details' }, { status: 500 });
  }
};

export const updateOrderStatusAdmin = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { orderId, status } = body;
    if (!orderId || !status) return NextResponse.json({ error: 'Missing order ID or status' }, { status: 400 });

    await updateOrderStatus(orderId, status);
    return NextResponse.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update order status' }, { status: 500 });
  }
};