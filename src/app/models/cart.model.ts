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

    // @CartId là INOUT param → dùng output với initial value
    request.output("CartId", sql.UniqueIdentifier, cartId ?? null);
    request.input("UserId", sql.Int, userId ?? null);
    request.input("ProductId", sql.Int, productId);
    request.input("Quantity", sql.Int, quantity);

    const result = await request.execute("dbo.AddToCart");

    const outCartId = result.output.CartId as string;
    return outCartId;
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw new Error("Database error: Failed to add to cart");
  }
};

export type CartItem = {
  ProductId: number;
  Quantity: number;
  PriceAtAdded: number;
  Name: string;
  ImageUrl: string;
};

export const viewCart = async (cartId: string): Promise<CartItem[]> => {
  try {
    const pool = await getPool();

    const query = `
      SELECT ci.ProductId, ci.Quantity, ci.PriceAtAdded,
             p.Name, p.ImageUrl
      FROM dbo.CartItems ci
      JOIN dbo.Products p ON ci.ProductId = p.ProductId
      WHERE ci.CartId = @CartId
    `;

    const result = await pool
      .request()
      .input("CartId", sql.UniqueIdentifier, cartId)
      .query<CartItem>(query);

    return result.recordset;
  } catch (err) {
    console.error("Error viewing cart:", err);
    throw new Error("Database error: Failed to load cart");
  }
};
