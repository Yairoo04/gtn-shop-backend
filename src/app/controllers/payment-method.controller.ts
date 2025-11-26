import { NextRequest, NextResponse } from 'next/server';
import { getActivePaymentMethods } from '~/app/models/payment-method.model';

export const getPaymentMethods = async (_req: NextRequest) => {
  try {
    const methods = await getActivePaymentMethods();

    return NextResponse.json(
      {
        success: true,
        data: methods,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('get PaymentMethods controller error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Không thể tải phương thức thanh toán',
      },
      { status: 500 }
    );
  }
};