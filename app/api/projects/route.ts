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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Get active projects
    let projects;
    if (type === 'preapproval') {
      // For pre-approval, show projects with different criteria or special projects
      projects = await Project.find({ active: true })
        .populate('projectManagerId', 'name email')
        .populate('functionalManagerId', 'name email')
        .select('name code projectManagerId functionalManagerId active')
        .sort({ name: 1 });
    } else {
      // Regular timesheet projects
      projects = await Project.find({ active: true })
        .populate('projectManagerId', 'name email')
        .populate('functionalManagerId', 'name email')
        .select('name code projectManagerId functionalManagerId active')
        .sort({ name: 1 });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Projects fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !userRole || userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { name, code, projectManagerId, functionalManagerId } = await request.json();

    if (!name || !code || !projectManagerId) {
      return NextResponse.json(
        { error: 'Name, code, and project manager are required' },
        { status: 400 }
      );
    }

    const project = new Project({
      name,
      code,
      projectManagerId,
      functionalManagerId: functionalManagerId || undefined,
      active: true,
    });

    await project.save();

    return NextResponse.json({ 
      message: 'Project created successfully',
      project 
    });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !userRole || userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { projectId, projectManagerId, functionalManagerId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (projectManagerId) updateData.projectManagerId = projectManagerId;
    if (functionalManagerId !== undefined) updateData.functionalManagerId = functionalManagerId;

    const project = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true }
    ).populate('projectManagerId', 'name email')
     .populate('functionalManagerId', 'name email');

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: 'Project updated successfully',
      project 
    });
  } catch (error) {
    console.error('Project update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







