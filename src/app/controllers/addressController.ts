import { getPool } from '../lib/db';
import { CreateAddressDto, UpdateAddressDto, Address } from '../models/addressModel';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

const getUserIdFromToken = (req: any): number => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing token');

  const token = authHeader.split(' ')[1];
  if (!token) throw new Error('Empty token');

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: number; id?: number; sub?: string };
    const userId = payload.userId ?? payload.id ?? payload.sub;
    if (!userId || isNaN(Number(userId))) throw new Error('Invalid userId');

    return Number(userId);
  } catch (err: any) {
    console.error('JWT Verify Error:', err.message);
    throw new Error('Token không hợp lệ hoặc hết hạn');
  }
};

export const getAddresses = async (req: any): Promise<Address[]> => {
  const userId = getUserIdFromToken(req);
  const pool = await getPool();
  const result = await pool.request()
    .input('UserId', userId)
    .query<Address>`SELECT * FROM Addresses WHERE UserId = @UserId ORDER BY IsDefault DESC, CreatedAt DESC`;
  return result.recordset;
};

export const createAddress = async (req: any): Promise<Address> => {
  const userId = getUserIdFromToken(req);
  const body: CreateAddressDto = await req.json();
  const { ReceiverName, PhoneNumber, Street, City, Province, IsDefault } = body;

  if (!ReceiverName || !PhoneNumber || !Street || !City || !Province) {
    throw new Error('Thiếu thông tin bắt buộc');
  }

  const pool = await getPool();

  // Tách riêng request cho mỗi query
  if (IsDefault) {
    await pool.request()
      .input('UserId', userId)
      .query('UPDATE Addresses SET IsDefault = 0 WHERE UserId = @UserId');
  }

  const result = await pool.request() // Request MỚI
    .input('UserId', userId)
    .input('ReceiverName', ReceiverName)
    .input('PhoneNumber', PhoneNumber)
    .input('Street', Street)
    .input('City', City)
    .input('Province', Province)
    .input('IsDefault', IsDefault ? 1 : 0)
    .query(`
      INSERT INTO Addresses (UserId, ReceiverName, PhoneNumber, Street, City, Province, IsDefault, CreatedAt)
      OUTPUT INSERTED.*
      VALUES (@UserId, @ReceiverName, @PhoneNumber, @Street, @City, @Province, @IsDefault, SYSUTCDATETIME())
    `);

  return result.recordset[0];
};

export const updateAddress = async (req: any): Promise<Address> => {
  const userId = getUserIdFromToken(req);
  const body: UpdateAddressDto = await req.json();
  const { AddressId, UserId: _, ...updates } = body;

  if (!AddressId) throw new Error('Thiếu AddressId');

  const pool = await getPool();

  const checkRequest = pool.request();
  checkRequest.input('UserId', userId);
  checkRequest.input('AddressId', AddressId);
  const check = await checkRequest.query('SELECT 1 FROM Addresses WHERE AddressId = @AddressId AND UserId = @UserId');
  if (check.recordset.length === 0) throw new Error('Không tìm thấy địa chỉ hoặc không có quyền');

  if (updates.IsDefault) {
    const defaultRequest = pool.request();
    defaultRequest.input('UserId', userId);
    await defaultRequest.query('UPDATE Addresses SET IsDefault = 0 WHERE UserId = @UserId AND IsDefault = 1');
  }

  const updateRequest = pool.request();
  updateRequest.input('AddressId', AddressId);
  updateRequest.input('UserId', userId);

  const fields: string[] = [];
  Object.entries(updates).forEach(([key, value]) => {
    if (key === 'UserId') return;
    const paramName = `@${key}`;
    fields.push(`${key} = ${paramName}`);
    const finalValue = key === 'IsDefault' ? (value ? 1 : 0) : value;
    updateRequest.input(key, finalValue);
  });

  if (fields.length === 0) throw new Error('Không có dữ liệu để cập nhật');

  const result = await updateRequest.query(`
    UPDATE Addresses
    SET ${fields.join(', ')}
    OUTPUT INSERTED.AddressId, INSERTED.UserId, INSERTED.ReceiverName, INSERTED.PhoneNumber, 
           INSERTED.Street, INSERTED.City, INSERTED.Province, INSERTED.IsDefault, INSERTED.CreatedAt
    WHERE AddressId = @AddressId AND UserId = @UserId
  `);

  if (result.recordset.length === 0) throw new Error('Cập nhật thất bại');
  return result.recordset[0];
};

export const deleteAddress = async (req: any, searchParams: URLSearchParams): Promise<void> => {
  const userId = getUserIdFromToken(req);
  const AddressId = Number(searchParams.get('AddressId'));
  if (!AddressId || isNaN(AddressId)) throw new Error('Thiếu hoặc sai AddressId');

  const pool = await getPool();
  const result = await pool.request()
    .input('AddressId', AddressId)
    .input('UserId', userId)
    .query`DELETE FROM Addresses WHERE AddressId = @AddressId AND UserId = @UserId`;

  if (result.rowsAffected[0] === 0) {
    throw new Error('Không tìm thấy địa chỉ để xóa');
  }
};