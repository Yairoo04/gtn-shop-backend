// src/app/utils/jwt.ts
import jwt from 'jsonwebtoken';

export type DecodedToken = {
  userId: number;
  email: string;
  role?: string;
};

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Chấp nhận cả payload kiểu { userId } hoặc { id }
    const userId =
      typeof decoded.userId === 'number'
        ? decoded.userId
        : typeof decoded.id === 'number'
        ? decoded.id
        : undefined;

    if (!userId) return null;

    return {
      userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    console.error('verifyToken error:', error);
    return null;
  }
}
