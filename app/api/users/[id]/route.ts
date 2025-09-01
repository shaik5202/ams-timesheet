import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const role = request.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { name, userRole, password } = await request.json();

    const update: Record<string, unknown> = {};
    if (name) update.name = name;
    if (userRole) update.role = userRole;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);

    const { id } = await params;
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'User updated',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const role = request.headers.get('x-user-role');
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



