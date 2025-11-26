import { NextRequest, NextResponse } from "next/server";
import * as cartModel from "~/app/models/cart.model";

export async function addToCartController(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("BODY RECEIVED:", body);

    const { cartId, userId, productId, quantity } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        { message: "productId, quantity are required" },
        { status: 400 }
      );
    }

    const newCartId = await cartModel.addToCart(
      cartId ?? null,
      userId != null ? Number(userId) : null,
      Number(productId),
      Number(quantity)
    );

    return NextResponse.json({ cartId: newCartId }, { status: 200 });
  } catch (err: any) {
    console.error("Controller error:", err);

    if (err.number === 50002 || err.number === 50003){
      return NextResponse.json(
        {message: err.message || "Sản phẩm đã hết hàng hoặc không đủ số lượng đặt mua"},
        {status: 400}
      )
    };
    return NextResponse.json(
      { message: "Có lỗi xảy ra, vui lòng thử lại sau", error: err.message },
      { status: 500 }
    );
  }
}

export async function viewCartController(req: NextRequest) {
  try {
    const cartId = req.nextUrl.searchParams.get("cartId");

    if (!cartId) {
      return NextResponse.json(
        { message: "CartId is required" },
        { status: 400 }
      );
    }

    const items = await cartModel.viewCart(cartId);

    return NextResponse.json(
      {
        cartId,
        items,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("View cart error:", err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 }
    );
  }
}