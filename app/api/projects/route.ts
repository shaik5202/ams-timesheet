import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Project from '../../../models/Project';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active projects
    const projects = await Project.find({ active: true })
      .populate('projectManagerId', 'name email')
      .select('name code projectManagerId active')
      .sort({ name: 1 });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Projects fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







