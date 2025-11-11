import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const text = message.toLowerCase().trim();

  let reply = "Xin lỗi, mình chưa hiểu yêu cầu của bạn.";
  let link: string | null = null;

  // ==========================================================
  // 🔍 0. Tiện ích parse giá (ví dụ: "từ 20 đến 30 triệu")
  // ==========================================================
  const range = text.match(/(\d{2})\D+(\d{2})/);
  const single = text.match(/\d{2,3}/);

  function priceToQuery(match: RegExpMatchArray | null) {
    if (!match) return "";
    if (match.length === 3)
      return `?min=${parseInt(match[1]) * 1_000_000}&max=${
        parseInt(match[2]) * 1_000_000
      }`;
    else return `?price=${parseInt(match[0]) * 1_000_000}`;
  }

  // ==========================================================
  // 💻 1. Laptop các loại
  // ==========================================================
  if (text.includes("laptop")) {
    const isGaming = text.includes("gaming") || text.includes("game");
    const isStudent = text.includes("sinh viên") || text.includes("học sinh");
    const isOffice = text.includes("văn phòng") || text.includes("office");
    const isGraphic = text.includes("đồ họa") || text.includes("design");

    if (isGaming) {
      reply = "Vâng! Đây là danh mục laptop gaming cho bạn:";
      link = `/collections/laptop-gaming${priceToQuery(range || single)}`;
    } else if (isStudent) {
      reply = "Laptop phù hợp cho học sinh – sinh viên:";
      link = `/collections/laptop-sinh-vien${priceToQuery(range || single)}`;
    } else if (isOffice) {
      reply = "Laptop văn phòng mỏng nhẹ, pin khỏe:";
      link = `/collections/laptop-van-phong${priceToQuery(range || single)}`;
    } else if (isGraphic) {
      reply = "Laptop chuyên đồ họa, render, thiết kế:";
      link = `/collections/laptop-do-hoa${priceToQuery(range || single)}`;
    } else {
      reply = "Bạn đang muốn tìm loại laptop nào (gaming, sinh viên, văn phòng, đồ họa)?";
      link = "/collections/laptop";
    }
  }

  // ==========================================================
  // 🖥️ 2. PC, màn hình, linh kiện, phụ kiện
  // ==========================================================
  else if (text.includes("pc") || text.includes("máy tính bàn")) {
    reply = "Danh mục PC – máy tính bàn tại GTN Shop:";
    link = `/collections/pc${priceToQuery(range || single)}`;
  }

  else if (text.includes("màn hình") || text.includes("monitor")) {
    reply = "Danh mục màn hình máy tính (gaming, đồ họa):";
    link = "/collections/man-hinh-may-tinh";
  }

  else if (text.includes("bàn phím") || text.includes("keyboard")) {
    if (text.includes("cơ")) {
      reply = "Danh mục bàn phím cơ gaming và văn phòng:";
      link = "/collections/ban-phim-co";
    } else {
      reply = "Các mẫu bàn phím chất lượng tại GTN Shop:";
      link = "/collections/ban-phim";
    }
  }

  else if (text.includes("chuột") || text.includes("mouse")) {
    reply = "Danh mục chuột không dây và chuột gaming:";
    link = "/collections/chuot";
  }

  else if (text.includes("tai nghe") || text.includes("headphone") || text.includes("earphone")) {
    reply = "Danh mục tai nghe gaming, bluetooth, headset:";
    link = "/collections/tai-nghe";
  }

  else if (text.includes("linh kiện") || text.includes("ram") || text.includes("ssd") || text.includes("vga") || text.includes("card")) {
    reply = "Linh kiện máy tính chính hãng – RAM, SSD, VGA, CPU:";
    link = "/collections/linh-kien";
  }

  else if (text.includes("phụ kiện") || text.includes("accessories")) {
    reply = "Phụ kiện máy tính, balo, chuột, cáp, đế tản nhiệt:";
    link = "/collections/phu-kien-may-tinh";
  }

  // 3. Chính sách, hỗ trợ, liên hệ
  else if (text.includes("bảo hành") || text.includes("warranty")) {
    reply = "Hotline bảo hành GTN Shop: 1800.6975 (miễn phí). Chi tiết:";
    link = "/chinh-sach-bao-hanh";
  }

  else if (text.includes("đổi trả") || text.includes("return") || text.includes("hoàn hàng")) {
    reply = "Chính sách đổi trả hàng linh hoạt của GTN Shop:";
    link = "/policy/doi-tra";
  }

  else if (text.includes("trả góp") || text.includes("installment")) {
    reply = "GTN Shop hỗ trợ trả góp 0% qua thẻ tín dụng và công ty tài chính:";
    link = "/policy/tra-gop";
  }

  else if (text.includes("giao hàng") || text.includes("vận chuyển") || text.includes("ship")) {
    reply = "Chính sách giao hàng toàn quốc của GTN Shop:";
    link = "/chinh-sach-giao-hang";
  }

  else if (text.includes("thanh toán") || text.includes("payment")) {
    reply = "GTN Shop hỗ trợ COD, chuyển khoản, thẻ tín dụng:";
    link = "/thanh-toan";
  }

  else if (text.includes("hỗ trợ kỹ thuật") || text.includes("technical support")) {
    reply = "Liên hệ kỹ thuật qua hotline 1800.6975 hoặc:";
    link = "/pages/ho-tro-ky-thuat";
  }

  else if (text.includes("liên hệ") || text.includes("hotline") || text.includes("số điện thoại")) {
    reply = "Hotline: 1800.6975 • Email: cskh@gtn.com • Giờ làm việc: 8:00 - 21:00 (T2 - CN)";
    link = "/contact";
  }

  else if (text.includes("địa chỉ") || text.includes("cửa hàng") || text.includes("store") ||  text.includes("giới thiệu") ) {
    reply = "GTN Shop có showroom tại 97 Nguyễn Văn Linh, Q.7, TP.HCM. Xem chi tiết về shop tại:";
    link = "/he-thong-cua-hang-gtn";
  }

  else if (text.includes("giờ làm việc") || text.includes("mở cửa") || text.includes("thời gian")) {
    reply = "GTN Shop mở cửa từ 8:00 - 21:00 hàng ngày, kể cả Thứ 7 & Chủ nhật.";
  }

  else if (text.includes("mua hàng") || text.includes("hướng dẫn mua")) {
    reply = "Hướng dẫn mua hàng online tại GTN Shop:";
    link = "/huong-dan-mua-hang";
  }

  else if (text.includes("đăng ký nhận tin") || text.includes("newsletter")) {
    reply = "Bạn có thể đăng ký nhận tin khuyến mãi tại footer website.";
  }

  else if (text.includes("tài khoản") || text.includes("account")) {
    reply = "Quản lý tài khoản và đơn hàng của bạn tại:";
    link = "/account";
  }

  else if (text.includes("kiểm tra đơn hàng") || text.includes("order status")) {
    reply = "Vui lòng cung cấp mã đơn hàng hoặc truy cập:";
    link = "/account/orders";
  }

  // ==========================================================
  // 💎 4. Danh mục đặc biệt
  // ==========================================================
  else if (text.includes("sản phẩm mới") || text.includes("new arrivals")) {
    reply = "Danh mục sản phẩm mới nhất tại GTN Shop:";
    link = "/collections/san-pham-moi";
  }

  else if (text.includes("bán chạy") || text.includes("best seller")) {
    reply = "Các sản phẩm bán chạy được khách hàng yêu thích:";
    link = "/collections/best-seller";
  }

  else if (text.includes("khuyến mãi") || text.includes("giảm giá") || text.includes("voucher") || text.includes("ưu đãi")) {
    reply = "Các chương trình khuyến mãi và flash sale hấp dẫn đang diễn ra:";
    link = "/collections/khuyen-mai";
  }

  // ==========================================================
  // 🏷️ 5. Thương hiệu phổ biến
  // ==========================================================
  else if (text.includes("asus")) {
    reply = "Danh mục laptop và PC ASUS tại GTN Shop:";
    link = "/collections/asus";
  }

  else if (text.includes("acer")) {
    reply = "Các mẫu laptop Acer mới nhất:";
    link = "/collections/acer";
  }

  else if (text.includes("dell")) {
    reply = "Laptop Dell nổi bật về độ bền và hiệu năng:";
    link = "/collections/dell";
  }

  else if (text.includes("lenovo")) {
    reply = "Laptop Lenovo ThinkPad, Ideapad đang giảm giá:";
    link = "/collections/lenovo";
  }

  else if (text.includes("msi")) {
    reply = "Laptop và PC gaming MSI chính hãng:";
    link = "/collections/msi";
  }

  else if (text.includes("hp")) {
    reply = "Laptop HP – thiết kế sang trọng, hiệu năng cao:";
    link = "/collections/hp";
  }

  // ==========================================================
  // 🎯 6. Câu hỏi chung / fallback
  // ==========================================================
  else if (text.includes("tư vấn") || text.includes("recommend")) {
    reply = "Bạn cần tư vấn loại sản phẩm nào? (Laptop, PC, phụ kiện...)";
  }

  else if (text.includes("ưu đãi") || text.includes("sự kiện")) {
    reply = "Các sự kiện và ưu đãi đặc biệt tại GTN Shop:";
    link = "/collections/khuyen-mai";
  }

  // ==========================================================
  // ✨ Default
  // ==========================================================
  return NextResponse.json({ reply, link });
}
