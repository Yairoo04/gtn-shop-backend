// src/app/api/payment/momo/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE || "MOMO";
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
const SECRET_KEY = process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";

const RETURN_URL = `${process.env.NEXT_PUBLIC_URL}/hoan-tat`;
const IPN_URL = `${process.env.BACKEND_URL}/api/payment/momo/ipn`;

export async function POST(req: NextRequest) {
  try {
    const { orderId, amount } = await req.json();

    if (!orderId || !amount || amount < 10000) {
      return NextResponse.json(
        { error: "Thiếu orderId hoặc amount < 10000" },
        { status: 400 }
      );
    }

    const requestId = `GTN${orderId}_${Date.now()}`;
    const orderInfo = `Thanh toán đơn hàng #${orderId} - GTN Shop`;

    const extraData = Buffer.from(
      JSON.stringify({ orderId: Number(orderId) })
    ).toString("base64");

    //  SIGNATURE 
    const rawSignature =
      `accessKey=${ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${IPN_URL}` +
      `&orderId=${requestId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${PARTNER_CODE}` +
      `&redirectUrl=${RETURN_URL}` +
      `&requestId=${requestId}` +
      `&requestType=captureWallet`;

    console.log("Raw signature:", rawSignature);

    const signature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const body = {
      partnerCode: PARTNER_CODE,
      accessKey: ACCESS_KEY,
      requestId,
      amount: amount.toString(),
      orderId: requestId,
      orderInfo,
      redirectUrl: RETURN_URL,
      ipnUrl: IPN_URL,
      extraData,
      requestType: "captureWallet",
      orderType: "momo_wallet",
      lang: "vi",
      signature,
    };

    console.log("Body gửi MoMo:", body);

    const response = await fetch(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    console.log("MoMo create response:", data);

    if (data.resultCode !== 0) {
      return NextResponse.json(
        { error: data.message, resultCode: data.resultCode },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payUrl: data.payUrl,
      requestId,
    });
  } catch (error) {
    console.error("Lỗi tạo MoMo:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
