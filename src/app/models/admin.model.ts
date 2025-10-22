// admin.model.ts
import sql from 'mssql';
import { getPool } from '../lib/db';

export const getCustomers = async (): Promise<any[]> => {
  try {
    const pool = await getPool();
    const result = await pool.request().execute('dbo.GetCustomers');
    console.log('Customers fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

export const getRevenueReport = async (period: string): Promise<any[]> => {
  try {
    const pool = await getPool();
    const request = pool.request().input('Period', sql.NVarChar, period);
    const result = await request.execute('dbo.GetRevenueReport');
    console.log('Revenue report fetched:', result.recordset);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    throw error;
  }
};