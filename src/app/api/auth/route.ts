import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser } from '../../models/user.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name, role } = await req.json();
    if (action === 'register') {
      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
      const newUser = await createUser({ email, password, name, role });
      return NextResponse.json({ success: true, data: newUser }, { status: 201 });
    } else if (action === 'login') {
      const user = await getUserByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = jwt.sign({ id: user.userId, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      return NextResponse.json({ success: true, data: { token, user } });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}