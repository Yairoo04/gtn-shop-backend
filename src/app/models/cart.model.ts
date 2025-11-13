// src/app/models/cart.model.ts
import sql from "mssql";
import { getPool } from "~/app/lib/db";

export const addToCart = async (
  cartId: string | null,
  userId: number,
  productId: number,
  quantity: number
): Promise<string> => {
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input("CartId", sql.UniqueIdentifier, cartId);
    request.input("UserId", sql.Int, userId);
    request.input("ProductId", sql.Int, productId);
    request.input("Quantity", sql.Int, quantity);
    request.output("CartId", sql.UniqueIdentifier);

    const result = await request.execute("dbo.AddToCart");
    return result.output.CartId;
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw new Error("Database error: Failed to add to cart");
  }
};

export const viewCart = async (cartId: string) => {
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
      .query(query);

    return result.recordset;
  } catch (err) {
    console.error("Error viewing cart:", err);
    throw new Error("Database error: Failed to load cart");
  }
};
