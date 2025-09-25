import { NextRequest, NextResponse } from 'next/server';
import { getUser, updateUser } from '../controllers/user.controller';

export async function GET(req: NextRequest) {
  return getUser(req);
}

export async function PUT(req: NextRequest) {
  return updateUser(req);
}