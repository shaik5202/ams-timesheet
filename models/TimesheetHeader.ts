import mongoose, { Schema, Document } from 'mongoose';

export interface ITimesheetHeader extends Document {
  employeeId: mongoose.Types.ObjectId;
  weekStart: Date;
  weekEnd: Date;
  status: 'Pending' | 'Submitted' | 'PM_Approved' | 'Approved' | 'Rejected';
  submittedOn?: Date;
  totalHours: number;
  pmId?: mongoose.Types.ObjectId;
  fmId?: mongoose.Types.ObjectId;
  pmDecision?: 'Approved' | 'Rejected';
  pmComment?: string;
  fmDecision?: 'Approved' | 'Rejected';
  fmComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimesheetHeaderSchema = new Schema<ITimesheetHeader>({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weekStart: {
    type: Date,
    required: true,
  },
  weekEnd: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Submitted', 'PM_Approved', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  submittedOn: {
    type: Date,
  },
  totalHours: {
    type: Number,
    required: true,
    default: 0,
  },
  pmId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  fmId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  pmDecision: {
    type: String,
    enum: ['Approved', 'Rejected'],
  },
  pmComment: {
    type: String,
    trim: true,
  },
  fmDecision: {
    type: String,
    enum: ['Approved', 'Rejected'],
  },
  fmComment: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one timesheet per employee per week
TimesheetHeaderSchema.index({ employeeId: 1, weekStart: 1 }, { unique: true });

export default mongoose.models.TimesheetHeader || mongoose.model<ITimesheetHeader>('TimesheetHeader', TimesheetHeaderSchema);



