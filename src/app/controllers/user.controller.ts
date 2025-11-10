import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserByEmail, createUser, updateUser as updateUserModel, changePasswordModel, changePasswordModelCustomer } from '../models/user.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByEmailCustomer, updateUserInfoCustomer, getUserByIdCustomer } from "../models/user.model";

// Lấy thông tin người dùng
export const loginUser = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

    const token = jwt.sign({ userId: user.userId, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    return NextResponse.json({ success: true, data: { token, user: { userId: user.userId, email: user.email, name: user.name } } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
};

export const registerUser = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { email, password, name } = body;
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });

    const newUser = await createUser({ email, password, name, role: 'user' });
    const token = jwt.sign({ userId: newUser.userId, email: newUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    return NextResponse.json({ success: true, data: { token, user: { userId: newUser.userId, email: newUser.email, name: newUser.name } } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
};

export const getUser = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userData = await getUserById(user.userId);
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: { userId: userData.userId, email: userData.email, name: userData.name, role: userData.role } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
  }
};

export const updateUser = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    if (!body.email || !body.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedUser = await updateUserModel(user.userId, body);
    if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
};

export const changePassword = async (req: NextRequest) => {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await req.json();
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing old or new password' }, { status: 400 });
    }

    await changePasswordModel(user.userId, oldPassword, newPassword);
    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to change password' }, { status: 500 });
  }
};

export const verifyToken = async (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { role: string; userId: number; email: string };
  } catch (error) {
    return null;
  }
};

// =============== Customer: Lấy thông tin người dùng theo token ===============
export const getCustomerInfo = async (req: NextRequest) => {
  try {
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await verifyToken(token);
    if (!decoded)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const user = await getUserByIdCustomer(decoded.userId);
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching customer info:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer info" },
      { status: 500 }
    );
  }
};

// =============== Customer: Cập nhật thông tin cá nhân (trừ email & loại KH) ===============
export const updateCustomerInfo = async (req: NextRequest) => {
  try {
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await verifyToken(token);
    if (!decoded)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { fullName, gender, phone } = body;

    if (!fullName || !gender || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await updateUserInfoCustomer(decoded.email, { fullName, gender, phone });

    return NextResponse.json({
      success: true,
      message: "Customer info updated successfully",
    });
  } catch (error) {
    console.error("Error updating customer info:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update customer info" },
      { status: 500 }
    );
  }
};

// =============== Customer: Đổi mật khẩu ===============
export const changeCustomerPassword = async (req: NextRequest) => {
  try {
    const token = req.headers.get("Authorization")?.split(" ")[1];
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await verifyToken(token);
    if (!decoded)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing old or new password" },
        { status: 400 }
      );
    }

    await changePasswordModelCustomer(decoded.userId, oldPassword, newPassword);
    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing customer password:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 }
    );
  }
};

