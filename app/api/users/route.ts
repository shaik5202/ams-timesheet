import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const role = request.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const role = request.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { name, email, password, userRole, managerId, functionalManagerId } = await request.json();

    if (!name || !email || !password || !userRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: userRole,
      managerId: managerId || undefined,
      functionalManagerId: functionalManagerId || undefined,
    });

    return NextResponse.json({
      message: 'User created',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
        functionalManagerId: user.functionalManagerId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('User create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



