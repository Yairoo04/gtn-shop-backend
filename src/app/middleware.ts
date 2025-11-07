import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { corsOptions } from './lib/config';
import { verifyToken } from './controllers/user.controller';

export async function middleware(req: NextRequest) {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const response = NextResponse.next();

  // CORS
  response.headers.set('Access-Control-Allow-Origin', corsOptions.origin);
  response.headers.set('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  response.headers.set('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));

  // Auth check for protected routes
  if (req.nextUrl.pathname.startsWith('/api/orders') || req.nextUrl.pathname.startsWith('/api/users')) {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token || !(await verifyToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};