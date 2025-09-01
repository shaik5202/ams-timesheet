'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Eye, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/use-toast';

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
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TimesheetsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
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
      const response = await fetch(`/api/timesheets?status=${activeTab}`);
      if (response.ok) {
        const data = await response.json();
        setTimesheets(data.timesheets);
      }
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch timesheets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'Submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
      case 'Approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'Rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
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

  const handleEdit = (timesheet: Timesheet) => {
    if (timesheet.status === 'Pending') {
      router.push(`/timesheets/new?id=${timesheet._id}`);
    }
  };

  const handleView = (timesheet: Timesheet) => {
    router.push(`/timesheets/${timesheet._id}`);
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
              <h1 className="text-xl font-bold text-gray-900">My Time Cards</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/timesheets/new')}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>New Timesheet</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="All">All</TabsTrigger>
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Submitted">Submitted</TabsTrigger>
              <TabsTrigger value="Approved">Approved</TabsTrigger>
              <TabsTrigger value="Rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Timesheets List */}
        <div className="space-y-4">
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
              <p className="text-gray-500">
                {activeTab === 'All' 
                  ? 'You haven\'t created any timesheets yet.'
                  : `No ${activeTab.toLowerCase()} timesheets found.`
                }
              </p>
              {activeTab === 'All' && (
                <Button
                  onClick={() => router.push('/timesheets/new')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Timesheet
                </Button>
              )}
            </div>
          ) : (
            filteredTimesheets.map((timesheet) => (
              <motion.div
                key={timesheet._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatWeekRange(timesheet.weekStart, timesheet.weekEnd)}
                      </h3>
                      {getStatusBadge(timesheet.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Total Hours:</span>
                        <span className="ml-2 text-gray-900 font-semibold">{timesheet.totalHours}</span>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className="ml-2 capitalize">{timesheet.status.toLowerCase()}</span>
                      </div>
                      {timesheet.submittedOn && (
                        <div>
                          <span className="font-medium">Submitted:</span>
                          <span className="ml-2">{formatDate(timesheet.submittedOn)}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Employee:</span>
                        <span className="ml-2">{timesheet.employeeId.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {timesheet.status === 'Pending' && (
                      <Button
                        onClick={() => handleEdit(timesheet)}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => handleView(timesheet)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </Button>
                  </div>
                </div>
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
                  {filteredTimesheets.filter(t => t.status === 'Pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredTimesheets.filter(t => t.status === 'Approved').length}
                </div>
                <div className="text-sm text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredTimesheets.reduce((sum, t) => sum + t.totalHours, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


