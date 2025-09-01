import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import TimesheetHeader from '../../../models/TimesheetHeader';
import TimesheetLine from '../../../models/TimesheetLine';
import User from '../../../models/User';
import Project from '../../../models/Project';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has approval access
    if (!['PM', 'FM', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query based on user role
    const query: Record<string, unknown> = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (userRole === 'ADMIN') {
      // Admin can see all timesheets
    } else if (userRole === 'PM') {
      // PM can see timesheets for projects they manage
      const managedProjects = await Project.find({ projectManagerId: userId });
      const projectIds = managedProjects.map(p => p._id);
      
      // Get timesheets that have lines for managed projects
      const timesheetIds = await TimesheetLine.distinct('headerId', {
        projectId: { $in: projectIds }
      });
      
      query._id = { $in: timesheetIds };
    } else if (userRole === 'FM') {
      // FM can see timesheets of their direct reports
      const directReports = await User.find({ functionalManagerId: userId });
      const employeeIds = directReports.map(u => u._id);
      query.employeeId = { $in: employeeIds };
    }

    // Fetch timesheets with populated data
    const timesheets = await TimesheetHeader.find(query)
      .populate('employeeId', 'name email')
      .populate('pmId', 'name email')
      .populate('fmId', 'name email')
      .sort({ weekStart: -1 });

    // Get detailed information for each timesheet
    const timesheetsWithDetails = await Promise.all(
      timesheets.map(async (timesheet) => {
        const lines = await TimesheetLine.find({ headerId: timesheet._id })
          .populate('projectId', 'name code');
        
        return {
          ...timesheet.toObject(),
          lines,
        };
      })
    );

    return NextResponse.json({ timesheets: timesheetsWithDetails });
  } catch (error) {
    console.error('Approvals fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






