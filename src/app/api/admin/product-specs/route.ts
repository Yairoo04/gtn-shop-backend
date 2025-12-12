import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getPool } from "~/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { productId, specs } = await req.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "ProductId is required" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    console.log(`🗑️ Deleting old specs for ProductId ${productId}...`);
    
    // Delete existing specs for this product
    const deleteResult = await pool
      .request()
      .input("ProductId", sql.Int, productId)
      .query("DELETE FROM ProductSpecs WHERE ProductId = @ProductId");
    
    console.log(`✅ Deleted ${deleteResult.rowsAffected[0]} old specs`);

    // Insert new specs (filter out empty ones)
    const validSpecs = specs.filter(
      (spec: any) => spec.SpecName?.trim() && spec.SpecValue?.trim()
    );
    
    console.log(`📝 Inserting ${validSpecs.length} new specs...`);

    let insertedCount = 0;
    for (const spec of validSpecs) {
      await pool
        .request()
        .input("ProductId", sql.Int, productId)
        .input("SpecName", sql.NVarChar(100), spec.SpecName)
        .input("SpecValue", sql.NVarChar(sql.MAX), spec.SpecValue)
        .input("Warranty", sql.NVarChar(100), spec.Warranty || null)
        .query(
          "INSERT INTO ProductSpecs (ProductId, SpecName, SpecValue, Warranty) VALUES (@ProductId, @SpecName, @SpecValue, @Warranty)"
        );
      insertedCount++;
      console.log(`  ✅ Inserted spec ${insertedCount}: ${spec.SpecName} = ${spec.SpecValue}`);
    }

    console.log(`✅ Successfully saved ${insertedCount} specs to database for ProductId ${productId}`);

    return NextResponse.json({
      success: true,
      message: `Đã lưu ${insertedCount} thông số kỹ thuật`,
      count: insertedCount,
    });
  } catch (error: any) {
    console.error("Error saving product specs:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi lưu thông số" },
      { status: 500 }
    );
  }
}
