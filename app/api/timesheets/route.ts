import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import TimesheetHeader from '../../../models/TimesheetHeader';
import TimesheetLine from '../../../models/TimesheetLine';
import TimesheetHistory from '../../../models/TimesheetHistory';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userEmail = request.headers.get('x-user-email');
    const userName = request.headers.get('x-user-name');

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    const query: Record<string, unknown> = { employeeId: userId };
    if (status && status !== 'All') {
      query.status = status;
    }

    const timesheets = await TimesheetHeader.find(query)
      .sort({ weekStart: -1 })
      .populate('employeeId', 'name email');

    const response = NextResponse.json({ timesheets });
    // Echo user identity so client pages can read it from the response headers
    if (userId) response.headers.set('x-user-id', userId);
    if (userEmail) response.headers.set('x-user-email', userEmail);
    if (userRole) response.headers.set('x-user-role', userRole);
    if (userName) response.headers.set('x-user-name', userName);
    return response;
  } catch (error) {
    console.error('Timesheets fetch error:', error);
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

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { header, lines, action } = await request.json();

    if (!header || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Invalid timesheet data' },
        { status: 400 }
      );
    }

    // Validate week selection (only current or last week allowed) - normalize to start of day
    const now = new Date();
    const currentWeekStart = startOfDay(getWeekStart(now));
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const requestedWeekStart = startOfDay(getWeekStart(new Date(header.weekStart)));
    if (requestedWeekStart.getTime() !== currentWeekStart.getTime() && 
        requestedWeekStart.getTime() !== lastWeekStart.getTime()) {
      return NextResponse.json(
        { error: 'Only current week or last week is allowed' },
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

    // Validate all days are filled
    for (const line of lines) {
      const days = [line.mon, line.tue, line.wed, line.thu, line.fri, line.sat, line.sun];
      if (days.some(day => day === undefined || day === null)) {
        return NextResponse.json(
          { error: 'All days must be filled (0 is allowed)' },
          { status: 400 }
        );
      }
    }

    // Calculate week end
    const weekEnd = new Date(requestedWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Create or update timesheet header
    let timesheetHeader;
    if (header._id) {
      // Update existing
      timesheetHeader = await TimesheetHeader.findById(header._id);
      if (!timesheetHeader || timesheetHeader.employeeId.toString() !== userId) {
        return NextResponse.json(
          { error: 'Timesheet not found or access denied' },
          { status: 404 }
        );
      }
      if (timesheetHeader.status !== 'Pending') {
        return NextResponse.json(
          { error: 'Only pending timesheets can be modified' },
          { status: 400 }
        );
      }
    } else {
      // Create new
      timesheetHeader = new TimesheetHeader({
        employeeId: userId,
        weekStart: requestedWeekStart,
        weekEnd,
        status: action === 'submit' ? 'Submitted' : 'Pending',
        submittedOn: action === 'submit' ? new Date() : undefined,
        totalHours,
      });
    }

    if (action === 'submit') {
      timesheetHeader.status = 'Submitted';
      timesheetHeader.submittedOn = new Date();
    }

    timesheetHeader.totalHours = totalHours;
    await timesheetHeader.save();

    // Delete existing lines if updating
    if (header._id) {
      await TimesheetLine.deleteMany({ headerId: timesheetHeader._id });
    }

    // Create timesheet lines
    const timesheetLines = lines.map((line: Record<string, unknown>) => ({
      headerId: timesheetHeader._id,
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

    // Record history
    await TimesheetHistory.create({
      headerId: timesheetHeader._id,
      actorId: userId,
      action: action === 'submit' ? 'Submitted' : 'Saved',
      at: new Date(),
    });

    return NextResponse.json({
      message: `Timesheet ${action === 'submit' ? 'submitted' : 'saved'} successfully`,
      timesheetId: timesheetHeader._id,
    });
  } catch (error) {
    console.error('Timesheet save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}



