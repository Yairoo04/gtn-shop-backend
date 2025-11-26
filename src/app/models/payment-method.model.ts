import sql from 'mssql';
import { getPool } from '../lib/db';

export interface PaymentMethod {
    Id: number;
    Code: string;
    Name: string;
    Icon: string | null;
    SortOrder: number;
    IsActive: boolean;
}

export const getActivePaymentMethods = async (): Promise<PaymentMethod[]> => {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
      SELECT 
        Id,
        Code,
        Name,
        Icon,
        SortOrder,
        IsActive
      FROM PaymentMethods
      WHERE IsActive = 1
      ORDER BY SortOrder ASC
    `);

        return result.recordset as PaymentMethod[];
    } catch (error) {
        console.error('getActivePaymentMethods error:', error);
        throw error;
    }
};