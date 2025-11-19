import sql from 'mssql';
import { getPool } from '../lib/db';

// === INTERFACE ĐÚNG THEO BẢNG ===
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
  Stock: number | null;
  ImageUrl: string | null;
  IsPublished: boolean | null;
  ViewedAt: Date | null;
}

// === 1. GET ALL ===
export const getAllRecentViewProducts = async (): Promise<RecentViewProduct[]> => {
  const pool = await getPool();

  const result = await pool.request().query('SELECT * FROM dbo.RecentViewProducts ORDER BY ViewedAt DESC');
  return result.recordset;
};

// === 2. GET BY PRODUCT ID ===
export const getRecentViewsByProductId = async (productId: number): Promise<RecentViewProduct[]> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('SELECT * FROM dbo.RecentViewProducts WHERE ProductId = @ProductId ORDER BY ViewedAt DESC');
  return result.recordset;
};

// === 3. GET BY ID ===
export const getRecentViewById = async (id: number): Promise<RecentViewProduct | null> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .query('SELECT * FROM dbo.RecentViewProducts WHERE Id = @Id');
  return result.recordset[0] || null;
};

// === 4. ADD RECENT VIEW → DÙNG STORED PROCEDURE (CHỈNH SỬA) ===
export const addRecentView = async (userId: number, productId: number): Promise<void> => {
  const pool = await getPool();
  await pool
    .request()
    .input('UserId', sql.Int, userId)
    .input('ProductId', sql.Int, productId)
    .execute('AddRecentView'); // ĐÚNG SP: XÓA CŨ + THÊM MỚI + GIỮ 20
};

// === 5. UPDATE (TÙY CHỌN – KHÔNG DÙNG TRONG SP) ===
export const updateRecentView = async (
  id: number,
  recentView: Partial<Omit<RecentViewProduct, 'Id'>>
): Promise<RecentViewProduct | null> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('Id', sql.Int, id);

    const updates: string[] = [];
    const fieldMap: Record<string, { input: keyof typeof recentView; type: any }> = {
      UserId: { input: 'UserId', type: sql.Int },
      ProductId: { input: 'ProductId', type: sql.Int },
      Name: { input: 'Name', type: sql.NVarChar(255) },
      Description: { input: 'Description', type: sql.NVarChar },
      CategoryId: { input: 'CategoryId', type: sql.Int },
      SKU: { input: 'SKU', type: sql.NVarChar(50) },
      Price: { input: 'Price', type: sql.Decimal(18, 2) },
      DiscountPrice: { input: 'DiscountPrice', type: sql.Decimal(18, 2) },
      Stock: { input: 'Stock', type: sql.Int },
      ImageUrl: { input: 'ImageUrl', type: sql.NVarChar },
      IsPublished: { input: 'IsPublished', type: sql.Bit },
      ViewedAt: { input: 'ViewedAt', type: sql.DateTime },
    };

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
        Id INT, UserId INT, ProductId INT, Name NVARCHAR(255), Description NVARCHAR(MAX),
        CategoryId INT, SKU NVARCHAR(50), Price DECIMAL(18,2), DiscountPrice DECIMAL(18,2),
        Stock INT, ImageUrl NVARCHAR(MAX), IsPublished BIT, ViewedAt DATETIME
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

// === 6. DELETE ===
export const deleteRecentView = async (id: number): Promise<boolean> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('Id', sql.Int, id)
    .query('DELETE FROM dbo.RecentViewProducts WHERE Id = @Id');
  return result.rowsAffected[0] > 0;
};

// === 7. GET RECENT VIEWS FOR USER → DÙNG STORED PROCEDURE (CHỈNH SỬA) ===
export const getRecentViewProducts = async (userId: number, limit: number = 10): Promise<{
  ProductId: number;
  Name: string;
  Price: number;
  DiscountPrice: number | null;
  DisplayPrice: number;
  ImageUrl: string | null;
  ViewedAt: Date | null;
}[]> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('UserId', sql.Int, userId)
<<<<<<< HEAD
    .input('Limit', sql.Int, limit)
    .query(`
      SELECT TOP (@Limit) rv.* 
      FROM dbo.RecentViewProducts rv
      INNER JOIN dbo.Products p ON rv.ProductId = p.ProductId
      WHERE rv.UserId = @UserId AND p.IsPublished = 1
      ORDER BY rv.ViewedAt DESC
    `);
=======
    .input('Limit', sql.Int, Math.min(limit, 50))
    .execute('GetRecentViewedProducts'); // ĐÚNG SP: TRẢ VỀ DisplayPrice

>>>>>>> 9bea2a4a547455a564a56ea28cc759a3544f14c2
  return result.recordset;
};