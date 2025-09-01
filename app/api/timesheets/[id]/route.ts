import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import TimesheetHeader from '../../../../models/TimesheetHeader';
import TimesheetLine from '../../../../models/TimesheetLine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: timesheetId } = await params;

    // Fetch timesheet header
    const timesheetHeader = await TimesheetHeader.findById(timesheetId)
      .populate('employeeId', 'name email');

    if (!timesheetHeader) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Check access - employee can only see their own, managers can see based on role
    if (timesheetHeader.employeeId._id.toString() !== userId) {
      // Check if user is a manager with access
      if (userRole === 'ADMIN') {
        // Admin can see all
      } else if (userRole === 'PM') {
        // PM can see timesheets for projects they manage
        // This would need additional logic based on project relationships
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      } else if (userRole === 'FM') {
        // FM can see timesheets of their direct reports
        if (timesheetHeader.fmId?.toString() !== userId) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch timesheet lines
    const timesheetLines = await TimesheetLine.find({ headerId: timesheetId })
      .populate('projectId', 'name code');

    return NextResponse.json({
      header: timesheetHeader,
      lines: timesheetLines,
    });
  } catch (error) {
    console.error('Timesheet fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: timesheetId } = await params;
    const { header, lines, action } = await request.json();

    // Fetch existing timesheet
    const existingTimesheet = await TimesheetHeader.findById(timesheetId);
    if (!existingTimesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Check ownership and status
    if (existingTimesheet.employeeId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (existingTimesheet.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending timesheets can be modified' },
        { status: 400 }
      );
    }

    // Validate data
    if (!header || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Invalid timesheet data' },
        { status: 400 }
      );
    }

    // Validate totals: max 10 per day (across all lines), max 60 per week
    const totalHours = lines.reduce((sum: number, line: { lineTotal: number }) => sum + line.lineTotal, 0);
    if (totalHours > 60) {
      return NextResponse.json(
        { error: 'Total hours cannot exceed 60 per week' },
        { status: 400 }
      );
    }
    const days: Array<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'> = ['mon','tue','wed','thu','fri','sat','sun'];
    for (const day of days) {
      const dayTotal = lines.reduce((sum: number, line: Record<string, number>) => sum + (line[day] || 0), 0);
      if (dayTotal > 10) {
        return NextResponse.json(
          { error: `Total hours for ${day.toUpperCase()} cannot exceed 10` },
          { status: 400 }
        );
      }
    }

    // Update header
    existingTimesheet.status = action === 'submit' ? 'Submitted' : 'Pending';
    existingTimesheet.submittedOn = action === 'submit' ? new Date() : undefined;
    existingTimesheet.totalHours = totalHours;
    await existingTimesheet.save();

    // Delete existing lines and create new ones
    await TimesheetLine.deleteMany({ headerId: timesheetId });

    const timesheetLines = lines.map((line: Record<string, unknown>) => ({
      headerId: timesheetId,
      projectId: line.projectId,
      mon: line.mon,
      tue: line.tue,
      wed: line.wed,
      thu: line.thu,
      fri: line.fri,
      sat: line.sat,
      sun: line.sun,
      lineTotal: line.lineTotal,
      comment: line.comment,
    }));

    await TimesheetLine.insertMany(timesheetLines);

    return NextResponse.json({
      message: `Timesheet ${action === 'submit' ? 'submitted' : 'updated'} successfully`,
    });
  } catch (error) {
    console.error('Timesheet update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



