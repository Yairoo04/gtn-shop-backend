import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const text = message.toLowerCase().trim();

  let reply = "Xin lỗi, mình chưa hiểu yêu cầu của bạn. Bạn có muốn gửi yêu cầu hỗ trợ cho admin không? Hãy để lại số điện thoại/email và nội dung, chúng tôi sẽ liên hệ lại.";
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
  // 👋 Nhận diện câu chào (greeting)
  // ==========================================================
  if (/(^|\s)(hi|hello|chào|xin chào|good morning|good afternoon|good evening|hey|yo|hí|hì|alo|chao shop|chào shop|greetings)(!|\s|$)/.test(text)) {
    reply = "Xin chào! Mình là trợ lý ảo của GTN Shop. Bạn cần hỗ trợ gì? (ví dụ: hỏi về sản phẩm, bảo hành, khuyến mãi, tài khoản...)";
  }

  // ==========================================================
  // 💻 1. Laptop các loại & nhóm sản phẩm liên quan
  // ==========================================================
  else if (/(laptop|máy tính xách tay|notebook|macbook|chromebook)/.test(text)) {
    const isGaming = /(gaming|game|fps|esport|đồ họa nặng|cấu hình mạnh)/.test(text);
    const isStudent = /(sinh viên|học sinh|student|school|giá rẻ|bình dân|học online)/.test(text);
    const isOffice = /(văn phòng|office|word|excel|ppt|soạn thảo|nhẹ|pin lâu|di động)/.test(text);
    const isGraphic = /(đồ họa|design|photoshop|ai|premiere|render|3d|autocad|kỹ thuật|kiến trúc)/.test(text);
    const isApple = /(macbook|apple|m1|m2|macos)/.test(text);
    const isTouch = /(cảm ứng|touch|2 trong 1|2-in-1|lật xoay)/.test(text);
    if (isGaming) {
      reply = "Vâng! Đây là danh mục laptop gaming cấu hình mạnh cho bạn:";
      link = `/collections/laptop-gaming${priceToQuery(range || single)}`;
    } else if (isStudent) {
      reply = "Laptop phù hợp cho học sinh – sinh viên, giá tốt:";
      link = `/collections/laptop-sinh-vien${priceToQuery(range || single)}`;
    } else if (isOffice) {
      reply = "Laptop văn phòng mỏng nhẹ, pin khỏe, di động:";
      link = `/collections/laptop-van-phong${priceToQuery(range || single)}`;
    } else if (isGraphic) {
      reply = "Laptop chuyên đồ họa, render, thiết kế, kỹ thuật:";
      link = `/collections/laptop-do-hoa${priceToQuery(range || single)}`;
    } else if (isApple) {
      reply = "Các mẫu Macbook chính hãng, chip M1/M2:";
      link = `/collections/macbook${priceToQuery(range || single)}`;
    } else if (isTouch) {
      reply = "Laptop cảm ứng, 2-in-1, lật xoay tiện dụng:";
      link = `/collections/laptop-cam-ung`;
    } else {
      reply = "Bạn muốn tìm loại laptop nào? (gaming, sinh viên, văn phòng, đồ họa, Macbook, cảm ứng...)";
      link = "/collections/laptop";
    }
  }

  // ==========================================================
  // 🖥️ 2. PC, màn hình, linh kiện, phụ kiện
  // ==========================================================
  else if (/(pc|máy tính bàn|desktop|máy bộ|máy ráp|máy chơi game|máy dựng)/.test(text)) {
    reply = "Danh mục PC – máy tính bàn, máy ráp, máy chơi game tại GTN Shop:";
    link = `/collections/pc${priceToQuery(range || single)}`;
  }

  else if (/(màn hình|monitor|display|lcd|led|màn gaming|màn đồ họa)/.test(text)) {
    reply = "Danh mục màn hình máy tính (gaming, đồ họa, văn phòng):";
    link = "/collections/man-hinh-may-tinh";
  }

  else if (/(bàn phím|keyboard|phím|keycap)/.test(text)) {
    if (/(cơ|mechanical|blue switch|red switch|brown switch)/.test(text)) {
      reply = "Danh mục bàn phím cơ gaming và văn phòng:";
      link = "/collections/ban-phim-co";
    } else {
      reply = "Các mẫu bàn phím chất lượng, đa dạng mẫu mã tại GTN Shop:";
      link = "/collections/ban-phim";
    }
  }

  else if (/(chuột|mouse|chuot|chuột gaming|chuột không dây|chuột bluetooth)/.test(text)) {
    // Nếu có từ khóa "tốt nhất", "top", "tham khảo", "nên mua", "best", "top", "gợi ý", "review" hoặc có giá
    if (/(tốt nhất|top|tham khảo|nên mua|best|gợi ý|review|đáng mua|được ưa chuộng|bán chạy|hot)/.test(text) || range || single) {
      let priceFilter = priceToQuery(range || single);
      reply = "Dưới đây là các mẫu chuột tốt nhất, bán chạy, được đánh giá cao hiện nay tại GTN Shop:";
      if (priceFilter) {
        reply += `\n\n🔎 Lọc theo tầm giá bạn quan tâm.`;
      }
      link = `/collections/chuot${priceFilter}`;
    } else {
      reply = "Danh mục chuột không dây, chuột gaming, chuột bluetooth:";
      link = "/collections/chuot";
    }
  }

  else if (/(tai nghe|headphone|earphone|tai nghe bluetooth|tai nghe gaming|headset|airpods)/.test(text)) {
    reply = "Danh mục tai nghe gaming, bluetooth, headset, AirPods:";
    link = "/collections/tai-nghe";
  }

  else if (/(linh kiện|linh kien|ram|ssd|vga|card|cpu|mainboard|bo mạch|ổ cứng|ổ ssd|ổ hdd|psu|nguồn|case|quạt|fan|tản nhiệt|cooler|ổ di động)/.test(text)) {
    reply = "Linh kiện máy tính chính hãng – RAM, SSD, VGA, CPU, nguồn, case, tản nhiệt:";
    link = "/collections/linh-kien";
  }

  else if (/(phụ kiện|phu kien|accessories|balo|cáp|cable|hub|adapter|đế tản nhiệt|giá đỡ|webcam|micro|loa|usb|ổ di động|ổ cứng di động)/.test(text)) {
    reply = "Phụ kiện máy tính, balo, chuột, cáp, đế tản nhiệt, webcam, micro, loa, USB:";
    link = "/collections/phu-kien-may-tinh";
  }

  // 3. Chính sách, hỗ trợ, liên hệ
  else if (/(bảo hành|bao hanh|warranty|bảo trì|bảo dưỡng|sửa chữa|bảo hành tận nơi|bảo hành tại nhà)/.test(text)) {
    reply = "Hotline bảo hành GTN Shop: 1800.6975 (miễn phí). Xem chi tiết chính sách:";
    link = "/chinh-sach-bao-hanh";
  }

  else if (/(đổi trả|doi tra|return|hoàn hàng|trả hàng|đổi hàng|bảo đảm|refund|đền bù)/.test(text)) {
    reply = "Chính sách đổi trả hàng linh hoạt, hoàn tiền nhanh chóng của GTN Shop:";
    link = "/policy/doi-tra";
  }

  else if (/(trả góp|tra gop|installment|trả chậm|trả dần|mua trả góp|trả góp 0%|trả góp qua thẻ)/.test(text)) {
    reply = "GTN Shop hỗ trợ trả góp 0% qua thẻ tín dụng và công ty tài chính:";
    link = "/policy/tra-gop";
  }

  else if (/(giao hàng|giao hang|vận chuyển|ship|shipping|giao tận nơi|giao nhanh|giao hỏa tốc|giao COD|giao miễn phí|free ship)/.test(text)) {
    reply = "Chính sách giao hàng toàn quốc, giao nhanh, giao miễn phí của GTN Shop:";
    link = "/chinh-sach-giao-hang";
  }

  else if (/(thanh toán|thanh toan|payment|trả tiền|thanh toán online|chuyển khoản|quẹt thẻ|momo|zalopay|vnpay|cod|cash on delivery)/.test(text)) {
    reply = "GTN Shop hỗ trợ COD, chuyển khoản, thẻ tín dụng, ví điện tử (Momo, ZaloPay, VNPay):";
    link = "/thanh-toan";
  }

  else if (/(hỗ trợ kỹ thuật|ho tro ky thuat|technical support|sửa máy|cài win|cài phần mềm|khắc phục lỗi|bảo trì|fix lỗi|hỗ trợ từ xa|remote|teamviewer|anydesk)/.test(text)) {
    reply = "Liên hệ kỹ thuật qua hotline 1800.6975 hoặc gửi yêu cầu tại đây:";
    link = "/pages/ho-tro-ky-thuat";
  }

  else if (/(liên hệ|lien he|hotline|số điện thoại|contact|gọi điện|gửi mail|email|inbox|fb|facebook|zalo|messenger)/.test(text)) {
    reply = "Hotline: 1800.6975 • Email: cskh@gtn.com • Zalo/Facebook: GTN Shop • Giờ làm việc: 8:00 - 21:00 (T2 - CN)";
    link = "/contact";
  }

  else if (/(địa chỉ|dia chi|cửa hàng|cua hang|store|showroom|giới thiệu|gioi thieu|địa điểm|map|bản đồ|đường đi|đến shop|đến cửa hàng)/.test(text)) {
    reply = "GTN Shop có showroom tại 97 Nguyễn Văn Linh, Q.7, TP.HCM. Xem chi tiết về shop tại:";
    link = "/he-thong-cua-hang-gtn";
  }

  else if (/(giờ làm việc|gio lam viec|mở cửa|mo cua|thời gian|thoi gian|giờ mở cửa|giờ đóng cửa|giờ nhận khách|giờ tư vấn|giờ hỗ trợ)/.test(text)) {
    reply = "GTN Shop mở cửa từ 8:00 - 21:00 hàng ngày, kể cả Thứ 7 & Chủ nhật.";
  }

  else if (/(mua hàng|mua hang|hướng dẫn mua|huong dan mua|cách mua|đặt hàng|dat hang|order|mua online|mua trực tuyến|mua tại shop)/.test(text)) {
    reply = "Hướng dẫn mua hàng online, đặt hàng tại GTN Shop:";
    link = "/huong-dan-mua-hang";
  }

  else if (/(đăng ký nhận tin|dang ky nhan tin|newsletter|nhận khuyến mãi|nhận ưu đãi|đăng ký email|subscribe|subcribe|đăng ký nhận email)/.test(text)) {
    reply = "Bạn có thể đăng ký nhận tin khuyến mãi, ưu đãi tại footer website hoặc nhập email ở popup đăng ký.";
  }

  else if (/(tài khoản|tai khoan|account|đăng nhập|dang nhap|đăng ký|dang ky|quên mật khẩu|quen mat khau|đổi mật khẩu|doi mat khau|reset password|profile|user|member|khách hàng|khach hang)/.test(text)) {
    reply = "Quản lý tài khoản, đăng nhập, đăng ký, đổi mật khẩu, xem đơn hàng của bạn tại:";
    link = "/account";
  }

  else if (/(kiểm tra đơn hàng|kiem tra don hang|order status|xem đơn hàng|xem don hang|tình trạng đơn|trạng thái đơn|đơn hàng của tôi|đơn hàng đang giao|đơn hàng đã đặt|mã đơn hàng|tra cứu đơn hàng|tracking|track order)/.test(text)) {
    reply = "Vui lòng cung cấp mã đơn hàng hoặc truy cập mục quản lý đơn hàng của bạn tại:";
    link = "/account/orders";
  }

  // ==========================================================
  // 💎 4. Danh mục đặc biệt
  // ==========================================================
  else if (/(sản phẩm mới|san pham moi|new arrivals|hàng mới về|hang moi ve|mới cập nhật|moi cap nhat)/.test(text)) {
    reply = "Danh mục sản phẩm mới nhất, hàng mới về tại GTN Shop:";
    link = "/collections/san-pham-moi";
  }

  else if (/(bán chạy|ban chay|best seller|top bán chạy|top sản phẩm|sản phẩm hot|san pham hot|hot trend|được mua nhiều|duoc mua nhieu)/.test(text)) {
    reply = "Các sản phẩm bán chạy, được khách hàng yêu thích nhất:";
    link = "/collections/best-seller";
  }

  else if (/(khuyến mãi|khuyen mai|giảm giá|giam gia|voucher|ưu đãi|uu dai|flash sale|sale|mã giảm giá|ma giam gia|coupon|deal hot|deal sốc|deal soc|giá sốc|gia soc|giảm sâu|giam sau)/.test(text)) {
    reply = "Các chương trình khuyến mãi, giảm giá, flash sale hấp dẫn đang diễn ra:";
    link = "/collections/khuyen-mai";
  }

  // ==========================================================
  // 🏷️ 5. Thương hiệu phổ biến
  // ==========================================================
  else if (/(asus|rog|vivobook|zenbook)/.test(text)) {
    reply = "Danh mục laptop và PC ASUS, ROG, Vivobook, Zenbook tại GTN Shop:";
    link = "/collections/asus";
  }

  else if (/(acer|aspire|predator|nitro)/.test(text)) {
    reply = "Các mẫu laptop Acer Aspire, Predator, Nitro mới nhất:";
    link = "/collections/acer";
  }

  else if (/(dell|inspiron|xps|latitude|alienware)/.test(text)) {
    reply = "Laptop Dell Inspiron, XPS, Latitude, Alienware nổi bật về độ bền và hiệu năng:";
    link = "/collections/dell";
  }

  else if (/(lenovo|thinkpad|ideapad|legion|yoga)/.test(text)) {
    reply = "Laptop Lenovo ThinkPad, Ideapad, Legion, Yoga đang giảm giá:";
    link = "/collections/lenovo";
  }

  else if (/(msi|stealth|katana|gf|modern|gaming msi)/.test(text)) {
    reply = "Laptop và PC gaming MSI Stealth, Katana, GF, Modern chính hãng:";
    link = "/collections/msi";
  }

  else if (/(hp|pavilion|envy|spectre|omen|elitebook)/.test(text)) {
    reply = "Laptop HP Pavilion, Envy, Spectre, Omen, Elitebook – thiết kế sang trọng, hiệu năng cao:";
    link = "/collections/hp";
  }

  // ==========================================================
  // 🎯 6. Câu hỏi chung / fallback
  // ==========================================================
  else if (/(tư vấn|tu van|recommend|gợi ý|goi y|nên mua|chon gi|chọn gì|tư vấn mua|nên chọn|help me|help|tư vấn cấu hình|tư vấn sản phẩm)/.test(text)) {
    reply = "Bạn cần tư vấn loại sản phẩm nào? (Laptop, PC, phụ kiện, cấu hình, thương hiệu, giá...)";
  }

  else if (/(ưu đãi|uu dai|sự kiện|su kien|event|promotion|khuyến mãi|giảm giá|deal hot)/.test(text)) {
    reply = "Các sự kiện, ưu đãi, promotion đặc biệt tại GTN Shop:";
    link = "/collections/khuyen-mai";
  }

  // ==========================================================
  // ✨ Default
  // ==========================================================
  return NextResponse.json({ reply, link });
}
