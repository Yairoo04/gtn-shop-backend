// API Admin - Quản lý sản phẩm
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import sql from 'mssql';

// GET: Lấy danh sách sản phẩm
export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();

    // Query danh sách tất cả sản phẩm
    const result = await pool.request().query(`
      SELECT TOP (1000)
        p.ProductId,
        p.Name AS ProductName,
        p.SKU,
        p.CategoryId,
        c.Name AS CategoryName,
        p.Price,
        p.DiscountPrice,
        p.Stock AS StockQuantity,
        p.ImageUrl,
        p.Description,
        p.IsPublished,
        p.CreatedAt,
        p.UpdatedAt
      FROM dbo.Products p
      LEFT JOIN dbo.Categories c ON p.CategoryId = c.CategoryId
      ORDER BY p.CreatedAt DESC
    `);

    return NextResponse.json({ 
      success: true, 
      data: result.recordset 
    });
  } catch (error: any) {
    console.error('❌ GET /api/admin/products error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST: Thêm sản phẩm mới
export async function POST(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();
    const { productName, description, price, discountPrice, stockQuantity, categoryId, imageUrl, sku } = body;

    if (!productName || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: productName, price, categoryId' },
        { status: 400 }
      );
    }

    const result = await pool.request()
      .input('Name', sql.NVarChar, productName)
      .input('Description', sql.NVarChar, description || null)
      .input('Price', sql.Decimal(18, 2), price)
      .input('DiscountPrice', sql.Decimal(18, 2), discountPrice || null)
      .input('Stock', sql.Int, stockQuantity || 0)
      .input('CategoryId', sql.Int, categoryId)
      .input('ImageUrl', sql.NVarChar, imageUrl || null)
      .input('SKU', sql.NVarChar, sku || null)
      .query(`
        INSERT INTO dbo.Products (
          Name, Description, CategoryId, SKU, Price, DiscountPrice, 
          Stock, ImageUrl, IsPublished, CreatedAt, UpdatedAt
        )
        VALUES (
          @Name, @Description, @CategoryId, @SKU, @Price, @DiscountPrice,
          @Stock, @ImageUrl, 1, GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() AS ProductId;
      `);

    const newProductId = result.recordset[0].ProductId;

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      productId: newProductId,
    });
  } catch (error: any) {
    console.error('❌ POST /api/admin/products error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật sản phẩm
export async function PUT(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();
    const { productId, action, data } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId' }, 
        { status: 400 }
      );
    }

    // Action: toggle visibility (ẩn/hiện)
    if (action === 'togglePublished') {
      await pool.request()
        .input('ProductId', sql.Int, productId)
        .query(`
          UPDATE dbo.Products 
          SET IsPublished = CASE WHEN IsPublished = 1 THEN 0 ELSE 1 END,
              UpdatedAt = GETDATE()
          WHERE ProductId = @ProductId
        `);

      return NextResponse.json({ 
        success: true, 
        message: 'Product visibility toggled successfully' 
      });
    }

    // Action: update product info
    if (!data) {
      return NextResponse.json(
        { error: 'Missing data' }, 
        { status: 400 }
      );
    }

    const { productName, description, price, discountPrice, stockQuantity, categoryId, imageUrl } = data;

    await pool.request()
      .input('ProductId', sql.Int, productId)
      .input('ProductName', sql.NVarChar, productName)
      .input('Description', sql.NVarChar, description || null)
      .input('Price', sql.Decimal(18, 2), price)
      .input('DiscountPrice', sql.Decimal(18, 2), discountPrice || null)
      .input('Stock', sql.Int, stockQuantity)
      .input('CategoryId', sql.Int, categoryId)
      .input('ImageUrl', sql.NVarChar, imageUrl || null)
      .query(`
        UPDATE dbo.Products 
        SET Name = @ProductName,
            Description = @Description,
            Price = @Price,
            DiscountPrice = @DiscountPrice,
            Stock = @Stock,
            CategoryId = @CategoryId,
            ImageUrl = @ImageUrl,
            UpdatedAt = GETDATE()
        WHERE ProductId = @ProductId
      `);

    return NextResponse.json({ 
      success: true, 
      message: 'Product updated successfully' 
    });
  } catch (error: any) {
    console.error('❌ PUT /api/admin/products error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa sản phẩm (hard delete)
export async function DELETE(req: NextRequest) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId' }, 
        { status: 400 }
      );
    }

    // Xóa theo thứ tự: CartItems → RecentViewProducts → ProductSpecs → OrderItems → Products
    console.log(`🗑️ Deleting related data for ProductId ${productId}...`);

    // 1. Xóa CartItems
    const deleteCartItemsResult = await pool.request()
      .input('ProductId', sql.Int, parseInt(productId, 10))
      .query('DELETE FROM dbo.CartItems WHERE ProductId = @ProductId');
    console.log(`✅ Deleted ${deleteCartItemsResult.rowsAffected[0]} cart items`);

    // 2. Xóa RecentViewProducts
    const deleteRecentViewResult = await pool.request()
      .input('ProductId', sql.Int, parseInt(productId, 10))
      .query('DELETE FROM dbo.RecentViewProducts WHERE ProductId = @ProductId');
    console.log(`✅ Deleted ${deleteRecentViewResult.rowsAffected[0]} recent view records`);

    // 3. Xóa ProductSpecs
    const deleteSpecsResult = await pool.request()
      .input('ProductId', sql.Int, parseInt(productId, 10))
      .query('DELETE FROM dbo.ProductSpecs WHERE ProductId = @ProductId');
    console.log(`✅ Deleted ${deleteSpecsResult.rowsAffected[0]} specs`);

    // 4. Xóa OrderItems (nếu có)
    const deleteOrderItemsResult = await pool.request()
      .input('ProductId', sql.Int, parseInt(productId, 10))
      .query('DELETE FROM dbo.OrderItems WHERE ProductId = @ProductId');
    console.log(`✅ Deleted ${deleteOrderItemsResult.rowsAffected[0]} order items`);

    // 5. Cuối cùng xóa Product
    console.log(`🗑️ Deleting Product ${productId}...`);
    await pool.request()
      .input('ProductId', sql.Int, parseInt(productId, 10))
      .query('DELETE FROM dbo.Products WHERE ProductId = @ProductId');

    console.log(`✅ Product ${productId} deleted successfully`);

    return NextResponse.json({ 
      success: true, 
      message: 'Đã xóa sản phẩm và dữ liệu liên quan thành công' 
    });
  } catch (error: any) {
    console.error('❌ DELETE /api/admin/products error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
