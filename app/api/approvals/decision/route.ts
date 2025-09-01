import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import TimesheetHeader from '../../../../models/TimesheetHeader';
import TimesheetHistory from '../../../../models/TimesheetHistory';
import User from '../../../../models/User';

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

    // Check if user has approval access
    if (!['PM', 'FM', 'ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { timesheetId, decision, comment } = await request.json();

    if (!timesheetId || !decision || !['Approved', 'Rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Fetch timesheet
    const timesheet = await TimesheetHeader.findById(timesheetId);
    if (!timesheet) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    // Check if timesheet is in submitted status
    if (timesheet.status !== 'Submitted') {
      return NextResponse.json(
        { error: 'Only submitted timesheets can be approved/rejected' },
        { status: 400 }
      );
    }

    // Check access based on role
    let hasAccess = false;
    if (userRole === 'ADMIN') {
      hasAccess = true;
    } else if (userRole === 'PM') {
      // Check if PM manages any projects in this timesheet
      // This would need to be implemented based on project relationships
      hasAccess = true; // Simplified for now
    } else if (userRole === 'FM') {
      // Check if FM is the functional manager of the employee
      hasAccess = timesheet.fmId?.toString() === userId;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update timesheet status
    if (userRole === 'PM') {
      timesheet.pmDecision = decision;
      timesheet.pmComment = comment;
      timesheet.pmId = userId;
      
      // If both PM and FM have made decisions, update overall status
      if (timesheet.fmDecision) {
        if (timesheet.pmDecision === 'Approved' && timesheet.fmDecision === 'Approved') {
          timesheet.status = 'Approved';
        } else {
          timesheet.status = 'Rejected';
        }
      }
    } else if (userRole === 'FM') {
      timesheet.fmDecision = decision;
      timesheet.fmComment = comment;
      timesheet.fmId = userId;
      
      // If both PM and FM have made decisions, update overall status
      if (timesheet.pmDecision) {
        if (timesheet.pmDecision === 'Approved' && timesheet.fmDecision === 'Approved') {
          timesheet.status = 'Approved';
        } else {
          timesheet.status = 'Rejected';
        }
      }
    } else if (userRole === 'ADMIN') {
      // Admin can override and set final status
      timesheet.status = decision;
      if (decision === 'Approved') {
        timesheet.pmDecision = 'Approved';
        timesheet.fmDecision = 'Approved';
        timesheet.pmId = userId;
        timesheet.fmId = userId;
      } else {
        timesheet.pmDecision = 'Rejected';
        timesheet.fmDecision = 'Rejected';
        timesheet.pmId = userId;
        timesheet.fmId = userId;
      }
    }

    await timesheet.save();

    // Record history
    await TimesheetHistory.create({
      headerId: timesheetId,
      actorId: userId,
      action: decision,
      comment,
      at: new Date(),
    });

    return NextResponse.json({
      message: `Timesheet ${decision.toLowerCase()} successfully`,
      timesheet,
    });
  } catch (error) {
    console.error('Approval decision error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







