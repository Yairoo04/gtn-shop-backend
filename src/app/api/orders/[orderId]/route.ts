// app/api/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "~/app/controllers/user.controller";
import { getOrderDetails } from "~/app/models/order.model";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    // ⭐ BẮT BUỘC: await context.params
    const { orderId } = await context.params;

    const id = Number(orderId);
    if (!id) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    const auth = req.headers.get("Authorization");
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.split(" ")[1];
    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const data = await getOrderDetails(id);

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", detail: err.message },
      { status: 500 }
    );
  }
}
