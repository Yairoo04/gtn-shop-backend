import sql from 'mssql';
import { getPool } from '../lib/db';

export interface Order {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  total_price: number;
  status: string;
}

export const getOrdersByUserId = async (user_id: number): Promise<Order[]> => {
  const pool = await getPool();
  const request = pool.request().input('user_id', sql.Int, user_id);
  const result = await request.query('SELECT * FROM Orders WHERE user_id = @user_id');
  return result.recordset;
};

export const createOrder = async (order: Omit<Order, 'id'>): Promise<Order> => {
  const pool = await getPool();
  const request = pool.request();
  const result = await request
    .input('user_id', sql.Int, order.user_id)
    .input('product_id', sql.Int, order.product_id)
    .input('quantity', sql.Int, order.quantity)
    .input('total_price', sql.Decimal(10, 2), order.total_price)
    .input('status', sql.NVarChar, order.status || 'pending')
    .query(`
      INSERT INTO Orders (user_id, product_id, quantity, total_price, status)
      OUTPUT INSERTED.*
      VALUES (@user_id, @product_id, @quantity, @total_price, @status)
    `);
  return result.recordset[0];
};