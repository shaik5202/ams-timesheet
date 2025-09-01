import mongoose, { Schema, Document } from 'mongoose';

export interface ITimesheetHistory extends Document {
  headerId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: 'Created' | 'Saved' | 'Submitted' | 'Approved' | 'Rejected';
  comment?: string;
  at: Date;
  createdAt: Date;
}

const TimesheetHistorySchema = new Schema<ITimesheetHistory>({
  headerId: {
    type: Schema.Types.ObjectId,
    ref: 'TimesheetHeader',
    required: true,
  },
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: ['Created', 'Saved', 'Submitted', 'Approved', 'Rejected'],
    required: true,
  },
  comment: {
    type: String,
    trim: true,
  },
  at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.models.TimesheetHistory || mongoose.model<ITimesheetHistory>('TimesheetHistory', TimesheetHistorySchema);



