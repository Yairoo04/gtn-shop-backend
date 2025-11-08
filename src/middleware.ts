import { NextResponse } from "next/server";

export function middleware(req: Request) {
  const response = NextResponse.next();

  // Thêm header CORS
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // Nếu là preflight (OPTIONS) → trả luôn, không đi tiếp
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

// Áp dụng middleware cho tất cả route API
export const config = {
  matcher: ["/api/:path*"],
};
