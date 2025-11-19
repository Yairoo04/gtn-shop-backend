// src/models/recentViewProduct.model.ts

import sql from 'mssql';
import { getPool } from '../lib/db';

// === INTERFACE ===
export interface RecentViewProduct {
  Id: number;
  UserId: number;
  ProductId: number;
  Name: string;
  Description: string | null;
  CategoryId: number | null;
  SKU: string | null;
  Price: number;
  DiscountPrice: number | null;
  Stock: number;
  ImageUrl: string | null;
  IsPublished: boolean;
  ViewedAt: Date;
}

// === GET ALL ===
export const getAllRecentViewProducts = async (): Promise<RecentViewProduct[]> => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT rv.* 
    FROM dbo.RecentViewProducts rv
    INNER JOIN dbo.Products p ON rv.ProductId = p.ProductId
    WHERE p.IsPublished = 1
  `);
  return result.recordset;
};

// === GET BY PRODUCT ID (RETURNS ARRAY AS MULTIPLE USERS MAY VIEW SAME PRODUCT) ===
export const getRecentViewsByProductId = async (productId: number): Promise<RecentViewProduct[]> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('SELECT * FROM dbo.RecentViewProducts WHERE ProductId = @ProductId');
  return result.recordset;
};

// === GET BY ID ===
export const getRecentViewById = async (id: number): Promise<RecentViewProduct | null> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .query('SELECT * FROM dbo.RecentViewProducts WHERE Id = @Id');
  return result.recordset[0] || null;
};

// === ADD RECENT VIEW (INSERT OR UPDATE IF EXISTS) ===
export const addRecentView = async (userId: number, productId: number): Promise<void> => {
  const pool = await getPool();
  
  // Kiểm tra product tồn tại trước
  const productCheck = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('SELECT TOP 1 1 FROM dbo.Products WHERE ProductId = @ProductId');
  
  if (productCheck.recordset.length === 0) {
    throw new Error(`Product with ID ${productId} does not exist`);
  }
  
  // Tiếp tục MERGE
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('ProductId', sql.Int, productId)
    .query(`
      MERGE INTO dbo.RecentViewProducts AS target
      USING (
        SELECT s.UserId, s.ProductId, p.Name, p.Description, p.CategoryId, p.SKU, p.Price, p.DiscountPrice, p.Stock, p.ImageUrl, p.IsPublished
        FROM (VALUES (@UserId, @ProductId)) s (UserId, ProductId)
        INNER JOIN dbo.Products p ON p.ProductId = s.ProductId
      ) AS source (UserId, ProductId, Name, Description, CategoryId, SKU, Price, DiscountPrice, Stock, ImageUrl, IsPublished)
      ON target.UserId = source.UserId AND target.ProductId = source.ProductId
      WHEN MATCHED THEN
        UPDATE SET 
          ViewedAt = GETDATE(),
          Name = source.Name,
          Description = source.Description,
          CategoryId = source.CategoryId,
          SKU = source.SKU,
          Price = source.Price,
          DiscountPrice = source.DiscountPrice,
          Stock = source.Stock,
          ImageUrl = source.ImageUrl,
          IsPublished = source.IsPublished
      WHEN NOT MATCHED THEN
        INSERT (UserId, ProductId, Name, Description, CategoryId, SKU, Price, DiscountPrice, Stock, ImageUrl, IsPublished, ViewedAt)
        VALUES (source.UserId, source.ProductId, source.Name, source.Description, source.CategoryId, source.SKU, source.Price, source.DiscountPrice, source.Stock, source.ImageUrl, source.IsPublished, GETDATE());
    `);
};

// === UPDATE ===
export const updateRecentView = async (
  id: number,
  recentView: Partial<Omit<RecentViewProduct, 'Id'>>
): Promise<RecentViewProduct | null> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('Id', sql.Int, id);

    const updates: string[] = [];

    // Map: DB column → input name → SQL type
    const fieldMap: Record<
      string,
      { input: keyof typeof recentView; type: any }
    > = {
      UserId: { input: 'UserId', type: sql.Int },
      ProductId: { input: 'ProductId', type: sql.Int },
      Name: { input: 'Name', type: sql.NVarChar },
      Description: { input: 'Description', type: sql.NVarChar },
      CategoryId: { input: 'CategoryId', type: sql.Int },
      SKU: { input: 'SKU', type: sql.NVarChar },
      Price: { input: 'Price', type: sql.Decimal(18, 2) },
      DiscountPrice: { input: 'DiscountPrice', type: sql.Decimal(18, 2) },
      Stock: { input: 'Stock', type: sql.Int },
      ImageUrl: { input: 'ImageUrl', type: sql.NVarChar },
      IsPublished: { input: 'IsPublished', type: sql.Bit },
      ViewedAt: { input: 'ViewedAt', type: sql.DateTime },
    };

    // Duyệt từng field trong DB
    for (const [dbField, { input, type }] of Object.entries(fieldMap)) {
      const value = recentView[input];
      if (value !== undefined) {
        updates.push(`${dbField} = @${input}`);
        request.input(input, type, value);
      }
    }

    if (updates.length === 0) return null;

    const query = `
      DECLARE @Output TABLE (
        Id INT, UserId INT, ProductId INT, Name NVARCHAR(255), Description NVARCHAR(MAX), CategoryId INT,
        SKU NVARCHAR(50), Price DECIMAL(18,2), DiscountPrice DECIMAL(18,2),
        Stock INT, ImageUrl NVARCHAR(255), IsPublished BIT,
        ViewedAt DATETIME
      );

      UPDATE dbo.RecentViewProducts
      SET ${updates.join(', ')}
      OUTPUT INSERTED.* INTO @Output
      WHERE Id = @Id;

      SELECT * FROM @Output;
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  } catch (error: any) {
    console.error('Update recent view error:', error);
    throw error;
  }
};

// === DELETE ===
export const deleteRecentView = async (id: number): Promise<boolean> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .query('DELETE FROM dbo.RecentViewProducts WHERE Id = @Id');
  return result.rowsAffected[0] > 0;
};

// === GET RECENT VIEWS FOR USER ===
export const getRecentViewProducts = async (userId: number, limit: number = 10): Promise<RecentViewProduct[]> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('Limit', sql.Int, limit)
    .query(`
      SELECT TOP (@Limit) rv.* 
      FROM dbo.RecentViewProducts rv
      INNER JOIN dbo.Products p ON rv.ProductId = p.ProductId
      WHERE rv.UserId = @UserId AND p.IsPublished = 1
      ORDER BY rv.ViewedAt DESC
    `);
  return result.recordset;
};