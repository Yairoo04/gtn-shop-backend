import { NextRequest, NextResponse } from 'next/server';
import { loginUser, registerUser, getUser, updateUser, changePassword } from '../../controllers/user.controller';
import express from "express";
// import { getUserInfoCustomer, updateUserCustomer} from '../../controllers/user.controller';
export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.endsWith('/login')) {
    return loginUser(req);
  } else if (path.endsWith('/register')) {
    return registerUser(req);
  } else if (path.endsWith('/change-password')) {
    return changePassword(req);
  }
  return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
}

export async function GET(req: NextRequest) {
  return getUser(req);
}

export async function PUT(req: NextRequest) {
  return updateUser(req);
}


