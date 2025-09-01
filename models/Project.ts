import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  code: string;
  projectManagerId: mongoose.Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  projectManagerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);



