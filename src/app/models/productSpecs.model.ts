// src/models/productSpecs.model.ts (New file - Add this to handle Specs separately)

import sql from 'mssql';
import { getPool } from '../lib/db';

// Interface for Spec (matching DB and aliases)
export interface Spec {
  component: string;  // SpecName
  detail: string;     // SpecValue
  warranty: string | null;
}

// Type for DB row
export type SpecRow = {
  SpecId: number;
  ProductId: number;
  SpecName: string;
  SpecValue: string;
  Warranty: string | null;
};

// === GET ALL SPECS FOR A PRODUCT ===
export const getSpecsByProductId = async (productId: number): Promise<SpecRow[]> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query(`
      SELECT 
        SpecId,
        ProductId,
        SpecName,
        SpecValue,
        Warranty
      FROM dbo.ProductSpecs 
      WHERE ProductId = @ProductId
      ORDER BY SpecId
    `);
  return result.recordset;
};

// === ADD SPECS (Bulk insert for a product) ===
export const addSpecs = async (productId: number, specs: Spec[]): Promise<void> => {
  const pool = await getPool();
  const transaction = pool.transaction();
  try {
    await transaction.begin();

    if (specs.length > 0) {
      let insertQuery = 'INSERT INTO dbo.ProductSpecs (ProductId, SpecName, SpecValue, Warranty) VALUES ';
      const values: string[] = [];
      const parameters: Record<string, string | null> = {};
      specs.forEach((spec, index) => {
        const paramPrefix = `spec${index}`;
        values.push(`(@ProductId, @${paramPrefix}_name, @${paramPrefix}_value, @${paramPrefix}_warranty)`);
        parameters[`${paramPrefix}_name`] = spec.component;
        parameters[`${paramPrefix}_value`] = spec.detail;
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
    console.error('Add specs error:', error.message, error.stack);
    throw new Error(`Failed to add specs: ${error.message}`);
  }
};

// === UPDATE SPECS (Replace all for a product - delete old, insert new) ===
export const updateSpecs = async (productId: number, specs: Spec[]): Promise<void> => {
  const pool = await getPool();
  const transaction = pool.transaction();
  try {
    await transaction.begin();

    // Delete old specs
    await transaction.request()
      .input('ProductId', sql.Int, productId)
      .query('DELETE FROM dbo.ProductSpecs WHERE ProductId = @ProductId');

    // Insert new specs if provided
    if (specs.length > 0) {
      let insertQuery = 'INSERT INTO dbo.ProductSpecs (ProductId, SpecName, SpecValue, Warranty) VALUES ';
      const values: string[] = [];
      const parameters: Record<string, string | null> = {};
      specs.forEach((spec, index) => {
        const paramPrefix = `spec${index}`;
        values.push(`(@ProductId, @${paramPrefix}_name, @${paramPrefix}_value, @${paramPrefix}_warranty)`);
        parameters[`${paramPrefix}_name`] = spec.component;
        parameters[`${paramPrefix}_value`] = spec.detail;
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
    console.error('Update specs error:', error.message, error.stack);
    throw new Error(`Failed to update specs: ${error.message}`);
  }
};

// === DELETE ALL SPECS FOR A PRODUCT ===
export const deleteSpecsByProductId = async (productId: number): Promise<boolean> => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('ProductId', sql.Int, productId)
    .query('DELETE FROM dbo.ProductSpecs WHERE ProductId = @ProductId');
  return result.rowsAffected[0] > 0;
};