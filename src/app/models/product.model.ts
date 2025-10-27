import sql from 'mssql';
import { getPool } from '../lib/db';

export interface Product {
  productId: number;
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
    const result = await pool.request().query('SELECT * FROM dbo.Products');
    console.log('Products fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProductById = async (productId: number): Promise<Product | null> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('productId', sql.Int, productId)
      .query('SELECT * FROM dbo.Products WHERE ProductId = @productId');
    console.log('Product fetched:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
};

export const createProduct = async (product: Omit<Product, 'productId'>): Promise<Product> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('name', sql.NVarChar, product.name)
      .input('description', sql.NVarChar, product.description)
      .input('price', sql.Decimal(18, 2), product.price)
      .input('category', sql.NVarChar, product.category)
      .input('stock', sql.Int, product.stock)
      .input('image_url', sql.NVarChar, product.image_url)
      .query(`
        INSERT INTO dbo.Products (Name, Description, Price, Category, Stock, ImageUrl)
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

export const updateProduct = async (productId: number, product: Partial<Product>): Promise<Product | null> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('productId', sql.Int, productId)
      .input('name', sql.NVarChar, product.name)
      .input('description', sql.NVarChar, product.description)
      .input('price', sql.Decimal(18, 2), product.price)
      .input('category', sql.NVarChar, product.category)
      .input('stock', sql.Int, product.stock)
      .input('image_url', sql.NVarChar, product.image_url)
      .query(`
        UPDATE dbo.Products
        SET Name = @name, Description = @description, Price = @price,
            Category = @category, Stock = @stock, ImageUrl = @image_url
        OUTPUT INSERTED.*
        WHERE ProductId = @productId
      `);
    console.log('Product updated:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: number): Promise<boolean> => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('productId', sql.Int, productId)
      .query('DELETE FROM dbo.Products WHERE ProductId = @productId');
    console.log('Product deleted:', result.rowsAffected[0] > 0);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Additional functions from stored procedures
export const searchProducts = async (keyword?: string, minPrice?: number, maxPrice?: number, categoryId?: number, page: number = 1, pageSize: number = 20): Promise<Product[]> => {
  try {
    const pool = await getPool();
    const request = pool.request()
      .input('Keyword', sql.NVarChar, keyword || null)
      .input('MinPrice', sql.Decimal(18, 2), minPrice || null)
      .input('MaxPrice', sql.Decimal(18, 2), maxPrice || null)
      .input('CategoryId', sql.Int, categoryId || null)
      .input('Page', sql.Int, page)
      .input('PageSize', sql.Int, pageSize);
    const result = await request.execute('dbo.SearchProducts');
    console.log('Products searched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

export const getProductDetails = async (productId: number): Promise<any | null> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('ProductId', sql.Int, productId);
    const result = await request.execute('dbo.GetProductDetails');
    console.log('Product details fetched:', result.recordset[0] || null);
    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw error;
  }
};

// Alias for createProduct, but using SP if preferred
export const addProduct = createProduct;  // Or implement SP if different