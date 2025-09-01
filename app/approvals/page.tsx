'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, CheckCircle, XCircle, MessageSquare, Calendar, Clock, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/use-toast';

interface TimesheetLine {
  _id: string;
  projectId: {
    _id: string;
    name: string;
    code: string;
  };
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
    lineTotal: number;
}

interface Timesheet {
  _id: string;
  weekStart: string;
  weekEnd: string;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
  totalHours: number;
  submittedOn?: string;
  employeeId: {
    _id: string;
    name: string;
    email: string;
  };
  pmId?: {
    _id: string;
    name: string;
  };
  fmId?: {
    _id: string;
    name: string;
  };
  pmDecision?: 'Approved' | 'Rejected';
  pmComment?: string;
  fmDecision?: 'Approved' | 'Rejected';
  fmComment?: string;
  lines: TimesheetLine[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ApprovalsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/timesheets');
        if (response.ok) {
          const userId = response.headers.get('x-user-id');
          const userName = response.headers.get('x-user-name');
          const userEmail = response.headers.get('x-user-email');
          const userRole = response.headers.get('x-user-role');
          
          if (userId && userName && userEmail && userRole) {
            // Check if user has approval access
            if (!['PM', 'FM', 'ADMIN'].includes(userRole)) {
              router.push('/');
              return;
            }
            
            setUser({
              id: userId,
              name: userName,
              email: userEmail,
              role: userRole,
            });
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
    fetchTimesheets();
    }
  }, [user, activeTab]);

  const fetchTimesheets = async () => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: activeTab }),
      });

      if (response.ok) {
        const data = await response.json();
        setTimesheets(data.timesheets);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch approvals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (timesheetId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/approvals/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timesheetId,
          decision: 'Approved',
          comment: 'Approved',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet approved successfully',
        });
        fetchTimesheets();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to approve timesheet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while approving',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (timesheetId: string) => {
    if (!rejectComment.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection comment',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/approvals/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timesheetId,
          decision: 'Rejected',
          comment: rejectComment,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Timesheet rejected successfully',
        });
        setShowRejectModal(false);
      setRejectComment('');
        setSelectedTimesheet(null);
        fetchTimesheets();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to reject timesheet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while rejecting',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Submitted</Badge>;
      case 'Approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDayTotal = (day: keyof Pick<TimesheetLine, 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>, lines: TimesheetLine[]) => {
    return lines.reduce((sum, line) => sum + (line[day] || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredTimesheets = activeTab === 'All' 
    ? timesheets 
    : timesheets.filter(t => t.status === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
                className="flex items-center space-x-2"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
            </Button>
              <div className="w-px h-6 bg-gray-300"></div>
            <h1 className="text-xl font-bold text-gray-900">Timesheet Approvals</h1>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="All">All</TabsTrigger>
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Approved">Approved</TabsTrigger>
              <TabsTrigger value="Rejected">Rejected</TabsTrigger>
          </TabsList>
          </Tabs>
        </div>

        {/* Timesheets List */}
        <div className="space-y-4">
            {filteredTimesheets.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
              <p className="text-gray-500">
                {activeTab === 'All' 
                  ? 'No timesheets require your approval.'
                  : `No ${activeTab.toLowerCase()} timesheets found.`
                    }
                  </p>
            </div>
            ) : (
            filteredTimesheets.map((timesheet) => (
                  <motion.div
                key={timesheet._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatWeekRange(timesheet.weekStart, timesheet.weekEnd)}
                    </h3>
                    {getStatusBadge(timesheet.status)}
                              </div>
                  
                          <div className="flex items-center space-x-2">
                    {timesheet.status === 'Submitted' && (
                      <>
                        <Button
                          onClick={() => handleApprove(timesheet._id)}
                          disabled={isProcessing}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2 text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedTimesheet(timesheet);
                            setShowRejectModal(true);
                          }}
                          disabled={isProcessing}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2 text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </Button>
                      </>
                    )}
                            <Button
                      onClick={() => setSelectedTimesheet(timesheet)}
                              variant="ghost"
                              size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                            </Button>
                          </div>
                        </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                                        <div>
                    <span className="font-medium">Employee:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{timesheet.employeeId?.name || 'Unknown'}</span>
                                        </div>
                  <div>
                    <span className="font-medium">Total Hours:</span>
                    <span className="ml-2 text-gray-900 font-semibold">{timesheet.totalHours}</span>
                            </div>
                  {timesheet.submittedOn && (
                    <div>
                      <span className="font-medium">Submitted:</span>
                      <span className="ml-2">{formatDate(timesheet.submittedOn)}</span>
                              </div>
                            )}
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2 capitalize">{timesheet.status.toLowerCase()}</span>
                                </div>
                              </div>

                {/* Approval History */}
                {(timesheet.pmDecision || timesheet.fmDecision) && (
                  <div className="bg-gray-50/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Approval History</h4>
                    <div className="space-y-2 text-sm">
                      {timesheet.pmDecision && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">PM Decision:</span>
                          <Badge variant={timesheet.pmDecision === 'Approved' ? 'default' : 'destructive'}>
                            {timesheet.pmDecision}
                          </Badge>
                          {timesheet.pmComment && (
                            <span className="text-gray-600">- {timesheet.pmComment}</span>
                          )}
                        </div>
                      )}
                      {timesheet.fmDecision && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">FM Decision:</span>
                          <Badge variant={timesheet.fmDecision === 'Approved' ? 'default' : 'destructive'}>
                            {timesheet.fmDecision}
                          </Badge>
                          {timesheet.fmComment && (
                            <span className="text-gray-600">- {timesheet.fmComment}</span>
                            )}
                          </div>
                      )}
                    </div>
                  </div>
                )}
                  </motion.div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {filteredTimesheets.length > 0 && (
          <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredTimesheets.length}</div>
                <div className="text-sm text-gray-600">Total Timesheets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredTimesheets.filter(t => t.status === 'Submitted').length}
                </div>
                <div className="text-sm text-gray-600">Pending Approval</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredTimesheets.filter(t => t.status === 'Approved').length}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {filteredTimesheets.filter(t => t.status === 'Rejected').length}
                </div>
                <div className="text-sm text-gray-600">Rejected</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Timesheet Detail Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Timesheet Details - {formatWeekRange(selectedTimesheet.weekStart, selectedTimesheet.weekEnd)}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTimesheet(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-600">Employee:</span>
                  <p className="text-gray-900">{selectedTimesheet.employeeId?.name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Total Hours:</span>
                  <p className="text-gray-900 font-semibold">{selectedTimesheet.totalHours}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <p className="text-gray-900">{getStatusBadge(selectedTimesheet.status)}</p>
                </div>
                {selectedTimesheet.submittedOn && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Submitted:</span>
                    <p className="text-gray-900">{formatDate(selectedTimesheet.submittedOn)}</p>
                  </div>
                )}
                </div>

              {/* Timesheet Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Project</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Mon</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Tue</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Wed</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Thu</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Fri</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Sat</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Sun</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedTimesheet.lines.map((line, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {line.projectId.code} - {line.projectId.name}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.mon}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.tue}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.wed}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.thu}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.fri}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.sat}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">{line.sun}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">{line.lineTotal}</td>
                      </tr>
                    ))}
                    
                    {/* Totals Row */}
                    <tr className="bg-blue-50 font-semibold">
                      <td className="px-4 py-3 text-gray-700">Totals</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('mon', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('tue', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('wed', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('thu', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('fri', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('sat', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('sun', selectedTimesheet.lines)}</td>
                      <td className="px-4 py-3 text-center text-blue-700 text-lg">{selectedTimesheet.totalHours}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Timesheet</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this timesheet. This comment will be visible to the employee.
            </p>
            
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
            />
            
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment('');
                  setSelectedTimesheet(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReject(selectedTimesheet!._id)}
                disabled={isProcessing || !rejectComment.trim()}
                variant="destructive"
                className="flex-1"
              >
                {isProcessing ? 'Rejecting...' : 'Reject Timesheet'}
              </Button>
            </div>
          </div>
      </div>
      )}
    </div>
  );
}


