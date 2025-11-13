// src/app/controllers/cart.controller.ts
import { NextRequest, NextResponse } from "next/server";
import * as cartModel from "~/app/models/cart.model";

export async function addToCartController(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("BODY RECEIVED:", body);

    const { cartId, userId, productId, quantity } = body;
    if (!userId || !productId || !quantity) {
      return NextResponse.json(
        { message: "userId, productId, quantity are required" },
        { status: 400 }
      );
    }

    const newCartId = await cartModel.addToCart(
      cartId ?? null,
      Number(userId),
      Number(productId),
      Number(quantity)
    );

    return NextResponse.json({ cartId: newCartId }, { status: 200 });
  } catch (err: any) {
    console.error("Controller error:", err);
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
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
    return NextResponse.json(
      { message: "Internal server error", error: err.message },
      { status: 500 }
    );
  }
}
