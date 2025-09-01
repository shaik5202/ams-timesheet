import mongoose, { Schema, Document } from 'mongoose';

export interface ITimesheetLine extends Document {
  headerId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  lineTotal: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimesheetLineSchema = new Schema<ITimesheetLine>({
  headerId: {
    type: Schema.Types.ObjectId,
    ref: 'TimesheetHeader',
    required: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  mon: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  tue: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  wed: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  thu: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  fri: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  sat: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  sun: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0,
  },
  lineTotal: {
    type: Number,
    required: true,
    default: 0,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Pre-save middleware to calculate line total
TimesheetLineSchema.pre('save', function(next) {
  this.lineTotal = this.mon + this.tue + this.wed + this.thu + this.fri + this.sat + this.sun;
  next();
});

// Compound index to ensure one line per project per timesheet
TimesheetLineSchema.index({ headerId: 1, projectId: 1 }, { unique: true });

export default mongoose.models.TimesheetLine || mongoose.model<ITimesheetLine>('TimesheetLine', TimesheetLineSchema);



