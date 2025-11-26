// src/app/api/payment/momo/ipn/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPool } from "../../../../lib/db";
import sql from "mssql";

const SECRET_KEY = process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("MoMo IPN:", body);

  // === BƯỚC 1: KIỂM TRA CHỮ KÝ (CHỐNG GIẢ MẠO) ===
  const signature = body.signature;
  const { signature: _, ...params } = body;

  const raw = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");

  const calculatedSig = crypto.createHmac("sha256", SECRET_KEY).update(raw).digest("hex");

  if (signature !== calculatedSig) {
    console.warn("IPN MoMo: Chữ ký không hợp lệ!");
    return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
  }

  // === BƯỚC 2: CHỈ XỬ LÝ KHI THANH TOÁN THÀNH CÔNG ===
  if (body.resultCode === "0" || body.resultCode === 0) {
    let orderId: number;

    try {
      const extra = JSON.parse(Buffer.from(body.extraData || "", "base64").toString("utf-8"));
      orderId = Number(extra.orderId);
    } catch {
      // fallback
      orderId = Number(body.orderId?.split("_")[0]?.replace("GTN", "")) || 0;
    }

    if (orderId > 0) {
      try {
        const pool = await getPool();
        const result = await pool.request()
          .input("OrderId", sql.Int, orderId)
          .query(`
            UPDATE Orders 
            SET StatusId = 2, Status = N'Processing', UpdatedAt = SYSUTCDATETIME()
            WHERE OrderId = @OrderId AND StatusId = 1
          `);

        if (result.rowsAffected[0] > 0) {
          console.log(`ĐƠN HÀNG #${orderId} ĐÃ ĐƯỢC CHUYỂN SANG PROCESSING`);
        }
      } catch (dbErr) {
        console.error("Lỗi cập nhật đơn:", dbErr);
      }
    }
  }

  return NextResponse.json({ message: "OK" });
}

export const GET = () => NextResponse.json({ message: "MoMo IPN GTN Shop" });