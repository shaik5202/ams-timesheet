import { ObjectId } from 'mongoose';

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: 'EMPLOYEE' | 'PM' | 'FM' | 'ADMIN';
  managerId?: ObjectId;
  functionalManagerId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  _id: ObjectId;
  name: string;
  code: string;
  projectManagerId: ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimesheetHeader {
  _id: ObjectId;
  employeeId: ObjectId;
  weekStart: Date;
  weekEnd: Date;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
  submittedOn?: Date;
  totalHours: number;
  pmId?: ObjectId;
  fmId?: ObjectId;
  pmDecision?: 'Approved' | 'Rejected';
  pmComment?: string;
  fmDecision?: 'Approved' | 'Rejected';
  fmComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimesheetLine {
  _id: ObjectId;
  headerId: ObjectId;
  projectId: ObjectId;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimesheetHistory {
  _id: ObjectId;
  headerId: ObjectId;
  actorId: ObjectId;
  action: 'Created' | 'Saved' | 'Submitted' | 'Approved' | 'Rejected';
  comment?: string;
  at: Date;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}



