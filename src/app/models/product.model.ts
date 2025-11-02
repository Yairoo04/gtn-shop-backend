// src/models/product.model.ts

import sql from 'mssql';
import { getPool } from '../lib/db';

// === INTERFACE ĐÚNG VỚI DB ===
export interface Product {
  ProductId: number;
  Name: string;
  Description: string;
  CategoryId: number;
  SKU: string;
  Price: number;
  DiscountPrice: number | null;
  Stock: number;
  ImageUrl: string;
  IsPublished: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

// === GET ALL ===
export const getAllProducts = async (): Promise<Product[]> => {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM dbo.Products');
  return result.recordset;
};

// === GET BY ID ===
export const getProductById = async (productId: number): Promise<Product | null> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('SELECT * FROM dbo.Products WHERE ProductId = @ProductId');
  return result.recordset[0] || null;
};

// === CREATE ===
export const createProduct = async (
  product: Omit<Product, 'ProductId' | 'CreatedAt' | 'UpdatedAt'>
): Promise<Product> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Name', sql.NVarChar, product.Name)
    .input('Description', sql.NVarChar, product.Description)
    .input('CategoryId', sql.Int, product.CategoryId)
    .input('SKU', sql.NVarChar, product.SKU)
    .input('Price', sql.Decimal(18, 2), product.Price)
    .input('DiscountPrice', sql.Decimal(18, 2), product.DiscountPrice ?? null)
    .input('Stock', sql.Int, product.Stock)
    .input('ImageUrl', sql.NVarChar, product.ImageUrl)
    .input('IsPublished', sql.Bit, product.IsPublished)
    .query(`
      INSERT INTO dbo.Products (
        Name, Description, CategoryId, SKU, Price, DiscountPrice,
        Stock, ImageUrl, IsPublished, CreatedAt
      )
      OUTPUT INSERTED.*
      VALUES (
        @Name, @Description, @CategoryId, @SKU, @Price, @DiscountPrice,
        @Stock, @ImageUrl, @IsPublished, GETDATE()
      )
    `);
  return result.recordset[0];
};

// === UPDATE – HOÀN CHỈNH, KHÔNG LỖI TS ===
export const updateProduct = async (
  productId: number,
  product: Partial<Omit<Product, 'ProductId' | 'CreatedAt'>>
): Promise<Product | null> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('ProductId', sql.Int, productId);

    const updates: string[] = [];

    // Map: DB column → input name → SQL type
    const fieldMap: Record<
      string,
      { input: keyof typeof product; type: any }
    > = {
      Name: { input: 'Name', type: sql.NVarChar },
      Description: { input: 'Description', type: sql.NVarChar },
      CategoryId: { input: 'CategoryId', type: sql.Int },
      SKU: { input: 'SKU', type: sql.NVarChar },
      Price: { input: 'Price', type: sql.Decimal(18, 2) },
      DiscountPrice: { input: 'DiscountPrice', type: sql.Decimal(18, 2) },
      Stock: { input: 'Stock', type: sql.Int },
      ImageUrl: { input: 'ImageUrl', type: sql.NVarChar },
      IsPublished: { input: 'IsPublished', type: sql.Bit },
    };

    // Duyệt từng field trong DB
    for (const [dbField, { input, type }] of Object.entries(fieldMap)) {
      const value = product[input];
      if (value !== undefined && value !== null) {
        updates.push(`${dbField} = @${input}`);
        request.input(input, type, value);
      }
    }

    if (updates.length === 0) return null;

    const query = `
      DECLARE @Output TABLE (
        ProductId INT, Name NVARCHAR(255), Description NVARCHAR(MAX), CategoryId INT,
        SKU NVARCHAR(50), Price DECIMAL(18,2), DiscountPrice DECIMAL(18,2),
        Stock INT, ImageUrl NVARCHAR(255), IsPublished BIT,
        CreatedAt DATETIME2, UpdatedAt DATETIME2
      );

      UPDATE dbo.Products
      SET ${updates.join(', ')}, UpdatedAt = GETDATE()
      OUTPUT INSERTED.* INTO @Output
      WHERE ProductId = @ProductId;

      SELECT * FROM @Output;
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  } catch (error: any) {
    console.error('Update product error:', error);
    throw error;
  }
};

// === DELETE ===
export const deleteProduct = async (productId: number): Promise<boolean> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('DELETE FROM dbo.Products WHERE ProductId = @ProductId');
  return result.rowsAffected[0] > 0;
};

// === SEARCH & DETAILS (SP) ===
export const searchProducts = async (
  keyword?: string,
  minPrice?: number,
  maxPrice?: number,
  categoryId?: number,
  page: number = 1,
  pageSize: number = 20
): Promise<Product[]> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Keyword', sql.NVarChar, keyword || null)
    .input('MinPrice', sql.Decimal(18, 2), minPrice || null)
    .input('MaxPrice', sql.Decimal(18, 2), maxPrice || null)
    .input('CategoryId', sql.Int, categoryId || null)
    .input('Page', sql.Int, page)
    .input('PageSize', sql.Int, pageSize)
    .execute('dbo.SearchProducts');
  return result.recordset;
};

export const getProductDetails = async (productId: number): Promise<any | null> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .execute('dbo.GetProductDetails');
  return result.recordset[0] || null;
};

export const addProduct = createProduct;