// API Admin - Quản lý khách hàng
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '../../../lib/db';
import sql from 'mssql';

// GET: Lấy danh sách khách hàng
export async function GET(req: NextRequest) {
  try {
    const pool = await getPool();
    const customerId = req.nextUrl.searchParams.get('customerId');

    // Nếu có customerId -> trả về chi tiết 1 khách hàng
    if (customerId) {
      const customerIdNum = parseInt(customerId, 10);
      if (!customerIdNum) {
        return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
      }

      // Query thông tin khách hàng
      const customerResult = await pool.request()
        .input('UserId', sql.Int, customerIdNum)
        .query(`
          SELECT 
            u.UserId,
            COALESCE(u.FullName, u.Username, u.Email) AS FullName,
            u.Email,
            u.Phone AS PhoneNumber,
            u.CreatedAt,
            u.RoleId,
            (SELECT COUNT(*) FROM dbo.Orders o WHERE o.UserId = u.UserId) AS TotalOrders,
            ISNULL((SELECT SUM(o.TotalAmount) FROM dbo.Orders o WHERE o.UserId = u.UserId), 0) AS TotalSpent
          FROM dbo.Users u
          WHERE u.UserId = @UserId AND u.RoleId = 2
        `);

      if (customerResult.recordset.length === 0) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: customerResult.recordset[0] });
    }

    // Không có customerId -> trả về danh sách tất cả khách hàng
    const result = await pool.request().query(`
      SELECT 
        u.UserId,
        COALESCE(u.FullName, u.Username, u.Email) AS FullName,
        u.Email,
        u.Phone AS PhoneNumber,
        u.CreatedAt,
        u.IsActive,
        (SELECT COUNT(*) FROM dbo.Orders o WHERE o.UserId = u.UserId) AS TotalOrders,
        ISNULL((SELECT SUM(o.TotalAmount) FROM dbo.Orders o WHERE o.UserId = u.UserId), 0) AS TotalSpent
      FROM dbo.Users u
      WHERE u.RoleId = 2
      ORDER BY u.CreatedAt DESC
    `);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error: any) {
    console.error('❌ GET /api/admin/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// PUT: Cập nhật thông tin khách hàng (block/unblock, edit info)
export async function PUT(req: NextRequest) {
  try {
    const pool = await getPool();
    const body = await req.json();
    const { customerId, action, data } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customerId' },
        { status: 400 }
      );
    }

    // Action: block/unblock tài khoản (IsActive)
    if (action === 'toggleBlock') {
      // Lấy trạng thái hiện tại
      const userResult = await pool.request()
        .input('UserId', sql.Int, customerId)
        .query('SELECT IsActive FROM dbo.Users WHERE UserId = @UserId AND RoleId = 2');
      if (!userResult.recordset[0]) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      const current = userResult.recordset[0].IsActive;
      // Đảo trạng thái
      await pool.request()
        .input('UserId', sql.Int, customerId)
        .input('IsActive', sql.Bit, !current)
        .query('UPDATE dbo.Users SET IsActive = @IsActive WHERE UserId = @UserId AND RoleId = 2');
      return NextResponse.json({
        success: true,
        message: !current ? 'Tài khoản đã được mở khóa' : 'Tài khoản đã bị khóa',
        isActive: !current
      });
    }

    // Action: update customer info
    if (action === 'update' && data) {
      const { fullName, email, phoneNumber } = data;

      await pool.request()
        .input('UserId', sql.Int, customerId)
        .input('FullName', sql.NVarChar, fullName)
        .input('Email', sql.NVarChar, email)
        .input('Phone', sql.NVarChar, phoneNumber || null)
        .query(`
          UPDATE dbo.Users 
          SET FullName = @FullName,
              Email = @Email,
              Phone = @Phone,
              UpdatedAt = GETDATE()
          WHERE UserId = @UserId AND RoleId = 2
        `);

      return NextResponse.json({
        success: true,
        message: 'Customer updated successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('❌ PUT /api/admin/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE: Xóa khách hàng (không khuyến khích - có thể soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customerId' },
        { status: 400 }
      );
    }

    // Hard delete (cẩn thận vì sẽ ảnh hưởng đến Orders)
    await pool.request()
      .input('UserId', sql.Int, parseInt(customerId, 10))
      .query(`
        DELETE FROM dbo.Users 
        WHERE UserId = @UserId AND RoleId = 2
      `);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ DELETE /api/admin/customers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
