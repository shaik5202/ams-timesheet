import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import TimesheetHeader from '../../../../models/TimesheetHeader';
import TimesheetHistory from '../../../../models/TimesheetHistory';
import User from '../../../../models/User';
import Project from '../../../../models/Project';
import TimesheetLine from '../../../../models/TimesheetLine';

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

    // Check if timesheet is in correct status for approval
    if (userRole === 'PM' && timesheet.status !== 'Submitted') {
      return NextResponse.json(
        { error: 'Only submitted timesheets can be approved by PM' },
        { status: 400 }
      );
    }
    
    if (userRole === 'FM' && timesheet.status !== 'PM_Approved') {
      return NextResponse.json(
        { error: 'Only PM-approved timesheets can be approved by FM' },
        { status: 400 }
      );
    }

    // Check access based on role
    let hasAccess = false;
    let approvalStep = '';

    if (userRole === 'ADMIN') {
      hasAccess = true;
      approvalStep = 'ADMIN_OVERRIDE';
    } else if (userRole === 'PM') {
      // Check if PM manages any projects in this timesheet
      const timesheetLines = await TimesheetLine.find({ headerId: timesheetId });
      const projectIds = timesheetLines.map(line => line.projectId);
      const managedProjects = await Project.find({ 
        projectManagerId: userId,
        _id: { $in: projectIds }
      });
      hasAccess = managedProjects.length > 0;
      approvalStep = 'PM_APPROVAL';
    } else if (userRole === 'FM') {
      // Check if FM is the functional manager of the employee
      hasAccess = timesheet.fmId?.toString() === userId || 
                  timesheet.employeeId.toString() === userId; // Allow FM to approve their own reports
      approvalStep = 'FM_APPROVAL';
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update timesheet based on approval step
    if (userRole === 'PM') {
      // PM approval step
      if (timesheet.pmDecision) {
        return NextResponse.json(
          { error: 'PM decision already made for this timesheet' },
          { status: 400 }
        );
      }

      timesheet.pmDecision = decision;
      timesheet.pmComment = comment;
      timesheet.pmId = userId;
      
      // If PM rejects, timesheet is immediately rejected
      if (decision === 'Rejected') {
        timesheet.status = 'Rejected';
      }
      // If PM approves, status changes to 'PM_Approved' until FM approves
      if (decision === 'Approved') {
        timesheet.status = 'PM_Approved';
      }
      
    } else if (userRole === 'FM') {
      // FM approval step - can only happen after PM approval
      if (!timesheet.pmDecision) {
        return NextResponse.json(
          { error: 'PM must approve before FM can approve' },
          { status: 400 }
        );
      }

      if (timesheet.fmDecision) {
        return NextResponse.json(
          { error: 'FM decision already made for this timesheet' },
          { status: 400 }
        );
      }

      timesheet.fmDecision = decision;
      timesheet.fmComment = comment;
      timesheet.fmId = userId;
      
      // Now both PM and FM have made decisions
      if (timesheet.pmDecision === 'Approved' && timesheet.fmDecision === 'Approved') {
        timesheet.status = 'Approved';
      } else {
        timesheet.status = 'Rejected';
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
      action: `${approvalStep}_${decision}`,
      comment,
      at: new Date(),
    });

    return NextResponse.json({
      message: `Timesheet ${decision.toLowerCase()} successfully`,
      timesheet,
      nextStep: getNextApprovalStep(timesheet, userRole),
    });
  } catch (error) {
    console.error('Approval decision error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getNextApprovalStep(timesheet: any, currentUserRole: string): string {
  if (timesheet.status === 'Approved') {
    return 'COMPLETED';
  } else if (timesheet.status === 'Rejected') {
    return 'REJECTED';
  } else if (timesheet.status === 'PM_Approved') {
    return 'WAITING_FOR_FM_APPROVAL';
  } else if (timesheet.status === 'Submitted' && !timesheet.pmDecision) {
    return 'WAITING_FOR_PM_APPROVAL';
  } else {
    return 'IN_PROGRESS';
  }
}







