import sql from "mssql";
import { getPool } from "~/app/lib/db";

export const addToCart = async (
  cartId: string | null,
  userId: number | null,
  productId: number,
  quantity: number
): Promise<string> => {
  try {
    const pool = await getPool();
    const request = pool.request();

    request.output("CartId", sql.UniqueIdentifier, cartId ?? null);
    request.input("UserId", sql.Int, userId ?? null);
    request.input("ProductId", sql.Int, productId);
    request.input("Quantity", sql.Int, quantity);

    const result = await request.execute("dbo.AddToCart");

    const outCartId = result.output.CartId as string;
    if (!outCartId) throw new Error("CartId không được trả về");
    return outCartId;
  } catch (error: any) {
    console.error("Error in addToCart:", error);
    throw new Error("Không thể thêm vào giỏ hàng: " + error.message);
  }
};

export interface CartItem {
  ProductId: number;
  ProductName: string;
  ImageUrl: string;
  PriceAtAdded: number;
  Quantity: number;
  LineTotal: number;
  Stock?: number; 
}

export const viewCart = async (cartId: string): Promise<CartItem[]> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("CartId", sql.UniqueIdentifier, cartId)
      .execute("dbo.ViewCart");

    console.log("[DEBUG] ViewCart raw result:", result.recordset);

    return result.recordset.map((item: any) => {
      // Đảm bảo ImageUrl là chuỗi đơn
      let imageUrl = '/images/placeholder.png';
      if (typeof item.ImageUrl === 'string') {
        try {
          const parsed = JSON.parse(item.ImageUrl);
          imageUrl = Array.isArray(parsed) && parsed[0] ? parsed[0] : '/images/placeholder.png';
        } catch {
          imageUrl = item.ImageUrl || '/images/placeholder.png';
        }
      }

      return {
        ProductId: item.ProductId,
        ProductName: item.ProductName,
        ImageUrl: imageUrl,
        PriceAtAdded: item.PriceAtAdded,
        Quantity: item.Quantity,
        LineTotal: item.LineTotal,
        Stock: item.Stock || 0,
      };
    });
  } catch (error: any) {
    console.error("Error in viewCart:", error);
    throw new Error("Không thể tải giỏ hàng: " + error.message);
  }
};

export const removeFromCart = async (cartId: string, productId: number): Promise<void> => {
  const pool = await getPool();
  await pool
    .request()
    .input("CartId", sql.UniqueIdentifier, cartId)
    .input("ProductId", sql.Int, productId)
    .execute("dbo.RemoveFromCart");
};

export const updateCartItem = async (
  cartId: string,
  productId: number,
  quantity: number
): Promise<{ LineTotal: number }> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("CartId", sql.UniqueIdentifier, cartId)
    .input("ProductId", sql.Int, productId)
    .input("Quantity", sql.Int, quantity)
    .execute("dbo.UpdateCartItem");

  return { LineTotal: result.recordset[0]?.LineTotal || 0 };
};