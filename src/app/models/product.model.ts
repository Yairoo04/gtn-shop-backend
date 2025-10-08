import sql from 'mssql';
import { getPool } from '../lib/db';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image_url: string;
}

export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Products');
    console.log('Products fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProductById = async (id: number): Promise<Product | null> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Products WHERE id = @id');
    console.log('Product fetched:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
};

export const createProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('name', sql.NVarChar, product.name)
      .input('description', sql.NVarChar, product.description)
      .input('price', sql.Decimal(10, 2), product.price)
      .input('category', sql.NVarChar, product.category)
      .input('stock', sql.Int, product.stock)
      .input('image_url', sql.NVarChar, product.image_url)
      .query(`
        INSERT INTO Products (name, description, price, category, stock, image_url)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @price, @category, @stock, @image_url)
      `);
    console.log('Product created:', result.recordset[0]);
    return result.recordset[0];
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: number, product: Partial<Product>): Promise<Product | null> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar, product.name)
      .input('description', sql.NVarChar, product.description)
      .input('price', sql.Decimal(10, 2), product.price)
      .input('category', sql.NVarChar, product.category)
      .input('stock', sql.Int, product.stock)
      .input('image_url', sql.NVarChar, product.image_url)
      .query(`
        UPDATE Products
        SET name = @name, description = @description, price = @price,
            category = @category, stock = @stock, image_url = @image_url
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
    console.log('Product updated:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: number): Promise<boolean> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Products WHERE id = @id');
    console.log('Product deleted:', result.rowsAffected[0] > 0);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};
