import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPool } from "../../../../lib/db";
import sql from "mssql";

const ACCESS_KEY = process.env.MOMO_ACCESS_KEY!;
const SECRET_KEY = process.env.MOMO_SECRET_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("MoMo IPN nhận được:", body);

    const rawSignature =
      `accessKey=${ACCESS_KEY}` +
      `&amount=${body.amount}` +
      `&extraData=${body.extraData}` +
      `&message=${body.message}` +
      `&orderId=${body.orderId}` +
      `&orderInfo=${body.orderInfo}` +
      `&orderType=${body.orderType}` +
      `&partnerCode=${body.partnerCode}` +
      `&payType=${body.payType}` +
      `&requestId=${body.requestId}` +
      `&responseTime=${body.responseTime}` +
      `&resultCode=${body.resultCode}` +
      `&transId=${body.transId}`;

    const mySignature = crypto.createHmac("sha256", SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    if (mySignature !== body.signature) {
      console.warn("Chữ ký không hợp lệ");
      return NextResponse.json({ message: "Invalid signature" }, { status: 200 });
    }

    // =====================================================
    // 1. HỦY ĐƠN NẾU THANH TOÁN THẤT BẠI (resultCode ≠ 0)
    // =====================================================
    if (body.resultCode !== 0) {
      const match = body.orderId?.match(/GTN(\d+)_/);
      const realOrderId = match ? Number(match[1]) : null;

      if (realOrderId) {
        const pool = await getPool();
        await pool
          .request()
          .input("orderId", sql.Int, realOrderId)
          .query(`
            UPDATE Orders
            SET StatusId = 6, Status = N'Cancelled'
            WHERE OrderId = @orderId
          `);

        console.log(`Đơn ${realOrderId} đã chuyển sang CANCELLED (resultCode=${body.resultCode})`);
      }

      return NextResponse.json({ message: "Payment failed, order cancelled" }, { status: 200 });
    }

    // =====================================================
    // 2. THANH TOÁN THÀNH CÔNG (resultCode = 0)
    // =====================================================

    let realOrderId = 0;

    try {
      const decoded = Buffer.from(body.extraData, "base64").toString("utf-8");
      realOrderId = JSON.parse(decoded).orderId;
      console.log("OrderId thật:", realOrderId);
    } catch (e) {
      console.error("Lỗi decode extraData", e);
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    if (realOrderId > 0) {
      const pool = await getPool();
      const result = await pool.request()
        .input("OrderId", sql.Int, realOrderId)
        .query(`
          UPDATE [GTN_Shop].[dbo].[Orders]
          SET 
            Status = N'Processing',
            StatusId = 2,
            PaymentMethod = N'Chuyển khoản ngân hàng / MoMo / QR',
            UpdatedAt = SYSUTCDATETIME()
          WHERE OrderId = @OrderId AND StatusId = 1
        `);

      if (result.rowsAffected[0] > 0) {
        console.log(`✔ ĐƠN ${realOrderId} đã UPDATE → PROCESSING`);
      } else {
        console.log(`⚠ Đơn ${realOrderId} không update`);
      }
    }

    return NextResponse.json({ resultCode: 0, message: "Success" });

  } catch (err) {
    console.error("Lỗi IPN:", err);
    return NextResponse.json({ message: "OK" });
  }
}
