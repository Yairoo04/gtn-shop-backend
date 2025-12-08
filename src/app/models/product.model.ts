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

export type ProductRow = {
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
  CreatedAt: string;
  UpdatedAt: string | null;
  CategoryName?: string | null;
};

export type SpecRow = {
  component: string;   // SpecName AS component
  detail: string;      // SpecValue AS detail
  warranty: string | null;
};

// === GET ALL ===
export const getAllProducts = async (): Promise<ProductRow[]> => {
  const pool = await getPool();
  // Lấy tất cả sản phẩm kèm tổng số đánh giá và điểm trung bình
  const result = await pool.request().query(`
    SELECT p.*, 
      ISNULL(r.TotalReviews, 0) AS totalReviews,
      ISNULL(r.AverageRating, 0) AS averageRating
    FROM dbo.Products p
    OUTER APPLY (
      SELECT COUNT(*) AS TotalReviews,
             CAST(AVG(CAST(pr.Rating AS DECIMAL(3,2))) AS DECIMAL(3,2)) AS AverageRating
      FROM dbo.ProductReviews pr
      WHERE pr.ProductId = p.ProductId AND pr.IsActive = 1
    ) r
    WHERE p.IsPublished = 1
    ORDER BY p.CreatedAt DESC
  `);
  return result.recordset;
};

// === GET BY ID ===
export const getProductById = async (productId: number): Promise<ProductRow | null> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('SELECT * FROM dbo.Products WHERE ProductId = @ProductId AND IsPublished = 1');
  return result.recordset[0] || null;
};

// === CREATE ===
export const createProduct = async (
  product: Omit<Product, 'ProductId' | 'CreatedAt' | 'UpdatedAt'>
): Promise<ProductRow> => {
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

// === UPDATE ===
export const updateProduct = async (
  productId: number,
  product: Partial<Omit<Product, 'ProductId' | 'CreatedAt'>>
): Promise<ProductRow | null> => {
  try {
    const pool = await getPool();

    // Check if product exists first
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return null; // Product not found
    }

    const request = pool.request().input('ProductId', sql.Int, productId);

    const updates: string[] = [];

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

    for (const [dbField, { input, type }] of Object.entries(fieldMap)) {
      const value = product[input];
      if (value !== undefined) { // Allow null to set fields to null
        updates.push(`${dbField} = @${input}`);
        request.input(input, type, value);
      }
    }

    if (updates.length === 0) {
      // No changes, return existing product
      return existingProduct;
    }

    const query = `
      DECLARE @Output TABLE (
        ProductId INT, Name NVARCHAR(300), Description NVARCHAR(1000), CategoryId INT,
        SKU NVARCHAR(100), Price DECIMAL(18,2), DiscountPrice DECIMAL(18,2),
        Stock INT, ImageUrl NVARCHAR(1000), IsPublished BIT,
        CreatedAt DATETIME2, UpdatedAt DATETIME2
      );

      UPDATE dbo.Products
      SET ${updates.join(', ')}, UpdatedAt = GETDATE()
      OUTPUT INSERTED.* INTO @Output
      WHERE ProductId = @ProductId;

      SELECT * FROM @Output;
    `;

    const result = await request.query(query);
    if (result.recordset.length === 0) {
      return null; // Should not happen if product exists
    }
    return result.recordset[0];
  } catch (error: any) {
    console.error('Update product error:', error.message, error.stack);
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

// === SEARCH ===
export const searchProducts = async (
  keyword?: string,
  minPrice?: number,
  maxPrice?: number,
  categoryId?: number,
  page: number = 1,
  pageSize: number = 20
): Promise<ProductRow[]> => {
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

// === GET PRODUCT DETAILS ===
export async function getProductDetails(productId: number): Promise<{ product: ProductRow | null; specs: SpecRow[] }> {
  try {
    const pool = await getPool();

    // Query 1: Product details
    const productResult = await pool.request()
      .input('ProductId', sql.Int, productId)
      .query(`
        SELECT p.*, c.Name AS CategoryName
        FROM dbo.Products p
        LEFT JOIN dbo.Categories c ON p.CategoryId = c.CategoryId
        WHERE p.ProductId = @ProductId AND p.IsPublished = 1
      `);
    const product = productResult.recordset[0] || null;

    // Query 2: Specs (tối ưu: ORDER BY để sắp xếp nếu cần, ví dụ theo SpecId)
    const specsResult = await pool.request()
      .input('ProductId', sql.Int, productId)
      .query(`
        SELECT 
          SpecName, 
          SpecValue, 
          Warranty 
        FROM dbo.ProductSpecs 
        WHERE ProductId = @ProductId
        ORDER BY SpecId  -- Tối ưu: Sắp xếp theo thứ tự insert nếu cần
      `);
    const specs = specsResult.recordset || [];

    return { product, specs };
  } catch (error: any) {
    console.error('[ERROR] getProductDetails failed:', error.message, error.stack);
    throw new Error(`Failed to fetch product details: ${error.message}`);
  }
}

// === GET PRODUCT LIST ===
export async function getProductList(): Promise<ProductRow[]> {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT p.ProductId, p.Name, p.Description, p.CategoryId, p.SKU,
           p.Price, p.DiscountPrice, p.Stock, p.ImageUrl, p.IsPublished,
           p.CreatedAt, p.UpdatedAt
    FROM dbo.Products p
    WHERE p.IsPublished = 1
    ORDER BY p.CreatedAt DESC
  `);
  return result.recordset;
};

export const addProduct = createProduct;

// === SEED SPECS (Helper cho dev, gọi thủ công nếu cần)
export async function seedSpecsForProduct(productId: number): Promise<void> {
  const pool = await getPool();
  const existing = await pool.request()
    .input('ProductId', sql.Int, productId)
    .query('SELECT COUNT(*) AS count FROM dbo.ProductSpecs WHERE ProductId = @ProductId');
  if (existing.recordset[0].count > 0) {
    return;  // Tối ưu: Không log, chỉ skip nếu tồn tại
  }
  await pool.request().query(`
    INSERT INTO dbo.ProductSpecs (ProductId, SpecName, SpecValue, Warranty) VALUES
    (${productId}, 'CPU', 'Intel Core i7-13620H (3.6GHz~4.9GHz) 10 Cores 16 Threads', '36 Tháng'),
    (${productId}, 'RAM', '16GB (1 x 16GB) DDR5 5200MHz (2x SO-DIMM socket, up to 64GB SDRAM)', '36 Tháng'),
    (${productId}, 'Ổ cứng', '512GB NVMe PCIe SSD Gen4x4 (1 slot)', '60 Tháng'),
    (${productId}, 'VGA', 'NVIDIA® GeForce RTX™ 3050 Laptop GPU, 4GB GDDR6', '36 Tháng'),
    (${productId}, 'Màn hình', '15.6" FHD (1920x1080), 144Hz, IPS-Level, 45% NTSC, 65% sRGB', '24 Tháng'),
    (${productId}, 'Pin', '3-Cell 53.5 Battery (Whr)', '12 Tháng');
  `);
}

// === UPDATE PRODUCT SPECS (Mới: Replace specs cho productId)
export async function updateProductSpecs(productId: number, specs: SpecRow[]): Promise<void> {
  const pool = await getPool();
  const transaction = pool.transaction();
  try {
    await transaction.begin();

    // Xóa specs cũ
    await transaction.request()
      .input('ProductId', sql.Int, productId)
      .query('DELETE FROM dbo.ProductSpecs WHERE ProductId = @ProductId');

    // Insert specs mới nếu có
    if (specs.length > 0) {
      let insertQuery = 'INSERT INTO dbo.ProductSpecs (ProductId, SpecName, SpecValue, Warranty) VALUES ';
      const values: string[] = [];
      const parameters: Record<string, string | null> = {};
      specs.forEach((spec, index) => {
        const paramPrefix = `spec${index}`;
        values.push(`(@ProductId, @${paramPrefix}_component, @${paramPrefix}_detail, @${paramPrefix}_warranty)`);
        parameters[`${paramPrefix}_component`] = spec.component;
        parameters[`${paramPrefix}_detail`] = spec.detail;
        parameters[`${paramPrefix}_warranty`] = spec.warranty;
      });
      insertQuery += values.join(', ');

      const request = transaction.request()
        .input('ProductId', sql.Int, productId);
      for (const [key, value] of Object.entries(parameters)) {
        request.input(key, sql.NVarChar, value);
      }
      await request.query(insertQuery);
    }

    await transaction.commit();
  } catch (error: any) {
    await transaction.rollback();
    console.error('Update product specs error:', error.message, error.stack);
    throw new Error(`Failed to update product specs: ${error.message}`);
  }
}