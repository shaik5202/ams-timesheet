import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'EMPLOYEE' | 'PM' | 'FM' | 'ADMIN';
  managerId?: mongoose.Types.ObjectId;
  functionalManagerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['EMPLOYEE', 'PM', 'FM', 'ADMIN'],
    default: 'EMPLOYEE',
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  functionalManagerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);



