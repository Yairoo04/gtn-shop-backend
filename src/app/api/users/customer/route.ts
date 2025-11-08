import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailCustomer, updateUserInfoCustomer } from '../../../models/user.model';

// ====================== GET ======================
// GET /api/users/customer?email=abc@gmail.com
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ success: false, error: "Thiếu email" }, { status: 400 });
    }

    const user = await getUserByEmailCustomer(email);
    if (!user) {
      return NextResponse.json({ success: false, error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    console.error("GET /api/users/customer failed:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// ====================== PUT ======================
// PUT /api/users/customer  (body: { email, fullName, gender, phone })
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName, gender, phone } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Thiếu email" }, { status: 400 });
    }

    // Gọi model chỉ cập nhật các trường được phép
    await updateUserInfoCustomer(email, { fullName, gender, phone });

    return NextResponse.json({ success: true, message: "Cập nhật thông tin thành công" }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/users/customer failed:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
