import sql from 'mssql';
import { getPool } from '../lib/db';

export const addToCart = async (cartId: string | null, userId: number | null, productId: number, quantity: number): Promise<string> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('CartId', sql.UniqueIdentifier, cartId)
      .input('UserId', sql.Int, userId)
      .input('ProductId', sql.Int, productId)
      .input('Quantity', sql.Int, quantity)
      .output('CartId', sql.UniqueIdentifier);
    await request.execute('dbo.AddToCart');
    const newCartId = request.parameters.CartId.value;
    console.log('Added to cart, CartId:', newCartId);
    return newCartId;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
};

export const viewCart = async (cartId: string): Promise<any[]> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('CartId', sql.UniqueIdentifier, cartId);
    const result = await request.execute('dbo.ViewCart');
    console.log('Cart viewed:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error viewing cart:', error);
    throw error;
  }
};