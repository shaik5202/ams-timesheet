'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Filter, 
  Download, 
  FileText, 
  Calendar,
  Clock,
  User,
  FolderOpen,
  Search,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import Navigation from '../../components/Navigation';

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
    email: string;
  };
  fmId?: {
    _id: string;
    name: string;
    email: string;
  };
  pmDecision?: 'Approved' | 'Rejected';
  pmComment?: string;
  fmDecision?: 'Approved' | 'Rejected';
  fmComment?: string;
  lines?: Array<{
    projectId: {
      _id: string;
      name: string;
      code: string;
    };
    hours: number;
    description: string;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function PreapprovalPage() {
  const [user, setUser] = useState<User | null>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/approvals');
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

  useEffect(() => {
    applyFilters();
  }, [timesheets, searchTerm, statusFilter, dateFilter]);

  const fetchTimesheets = async () => {
    try {
      const response = await fetch(`/api/approvals?status=${activeTab}`);
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

  const applyFilters = () => {
    // Filter out timesheets with null/undefined employeeId
    let filtered = timesheets.filter(t => t.employeeId && t.employeeId.name);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        (t.employeeId && t.employeeId.name && t.employeeId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.employeeId && t.employeeId.email && t.employeeId.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.lines && t.lines.some(line => 
          line.projectId && line.projectId.name && line.projectId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.projectId && line.projectId.code && line.projectId.code.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(t => {
        const weekStart = new Date(t.weekStart);
        return weekStart >= filterDate;
      });
    }

    setFilteredTimesheets(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'Submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Calendar className="w-3 h-3 mr-1" />Submitted</Badge>;
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

  const handleView = (timesheet: Timesheet) => {
    router.push(`/timesheets/${timesheet._id}`);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['Employee', 'Email', 'Week Range', 'Total Hours', 'Status', 'Submitted On', 'PM Decision', 'FM Decision', 'Projects'];
    const csvContent = [
      headers.join(','),
      ...filteredTimesheets.map(t => [
        t.employeeId?.name || 'Unknown',
        t.employeeId?.email || 'Unknown',
        formatWeekRange(t.weekStart, t.weekEnd),
        t.totalHours,
        t.status,
        t.submittedOn ? formatDate(t.submittedOn) : '',
        t.pmDecision || '',
        t.fmDecision || '',
        t.lines ? t.lines.map(l => `${l.projectId?.code || 'Unknown'}:${l.hours}h`).join('; ') : ''
      ].join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-approvals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Timesheet data exported to CSV',
    });
  };

  const exportToPDF = () => {
    try {
      // Import jsPDF dynamically to avoid SSR issues
      import('jspdf').then(({ default: jsPDF }) => {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text('Timesheet Approvals Report', 20, 20);
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
        
        // Add summary
        doc.setFontSize(14);
        doc.text('Summary', 20, 50);
        doc.setFontSize(10);
        doc.text(`Total Timesheets: ${filteredTimesheets.length}`, 20, 60);
        doc.text(`Pending: ${filteredTimesheets.filter(t => t.status === 'Pending').length}`, 20, 70);
        doc.text(`Submitted: ${filteredTimesheets.filter(t => t.status === 'Submitted').length}`, 20, 80);
        doc.text(`Approved: ${filteredTimesheets.filter(t => t.status === 'Approved').length}`, 20, 90);
        doc.text(`Rejected: ${filteredTimesheets.filter(t => t.status === 'Rejected').length}`, 20, 100);
        
        // Add timesheet details
        let yPosition = 120;
        filteredTimesheets.forEach((timesheet, index) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${index + 1}. ${timesheet.employeeId?.name || 'Unknown'} - ${formatWeekRange(timesheet.weekStart, timesheet.weekEnd)}`, 20, yPosition);
          yPosition += 10;
          
          doc.setFontSize(10);
          doc.text(`Status: ${timesheet.status}`, 30, yPosition);
          yPosition += 7;
          doc.text(`Total Hours: ${timesheet.totalHours}`, 30, yPosition);
          yPosition += 7;
          doc.text(`Submitted: ${timesheet.submittedOn ? formatDate(timesheet.submittedOn) : 'N/A'}`, 30, yPosition);
          yPosition += 7;
          
          if (timesheet.pmDecision) {
            doc.text(`PM Decision: ${timesheet.pmDecision}`, 30, yPosition);
            yPosition += 7;
          }
          if (timesheet.fmDecision) {
            doc.text(`FM Decision: ${timesheet.fmDecision}`, 30, yPosition);
            yPosition += 7;
          }
          
          yPosition += 10;
        });
        
        // Save the PDF
        doc.save(`timesheet-approvals-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast({
          title: 'PDF Export Successful',
          description: 'Timesheet data exported to PDF',
        });
      });
    } catch (error) {
      toast({
        title: 'PDF Export Failed',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation 
        userRole={user.role} 
        userName={user.name} 
        onLogout={handleLogout} 
      />

      {/* Export Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-end space-x-4">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
          <Button
            onClick={exportToPDF}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Submitted">Submitted</TabsTrigger>
              <TabsTrigger value="Approved">Approved</TabsTrigger>
              <TabsTrigger value="Rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search employee, project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">From Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setDateFilter('');
                }}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clear Filters</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Timesheets List */}
        <div className="space-y-4">
          {filteredTimesheets.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
              <p className="text-gray-500">
                {activeTab === 'All' 
                  ? 'No timesheets match your current filters.'
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatWeekRange(timesheet.weekStart, timesheet.weekEnd)}
                      </h3>
                      {getStatusBadge(timesheet.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">Employee:</span>
                        <span className="text-gray-900">{timesheet.employeeId?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Total Hours:</span>
                        <span className="text-gray-900 font-semibold">{timesheet.totalHours}</span>
                      </div>
                      {timesheet.submittedOn && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Submitted:</span>
                          <span className="text-gray-900">{formatDate(timesheet.submittedOn)}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className="ml-2 capitalize">{timesheet.status.toLowerCase()}</span>
                      </div>
                    </div>

                    {/* Project Details */}
                    {timesheet.lines && timesheet.lines.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Projects
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {timesheet.lines.map((line, index) => (
                                                         <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                               <span className="font-medium">{line.projectId?.code || 'Unknown'}:</span> {line.projectId?.name || 'Unknown'} - {line.hours}h
                             </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval Decisions */}
                    {(timesheet.pmDecision || timesheet.fmDecision) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {timesheet.pmDecision && (
                          <div className="bg-blue-50 p-3 rounded">
                            <span className="font-medium text-blue-800">PM Decision:</span>
                            <Badge 
                              variant={timesheet.pmDecision === 'Approved' ? 'default' : 'destructive'}
                              className="ml-2"
                            >
                              {timesheet.pmDecision}
                            </Badge>
                            {timesheet.pmComment && (
                              <p className="text-blue-700 mt-1">{timesheet.pmComment}</p>
                            )}
                          </div>
                        )}
                        {timesheet.fmDecision && (
                          <div className="bg-green-50 p-3 rounded">
                            <span className="font-medium text-green-800">FM Decision:</span>
                            <Badge 
                              variant={timesheet.fmDecision === 'Approved' ? 'default' : 'destructive'}
                              className="ml-2"
                            >
                              {timesheet.fmDecision}
                            </Badge>
                            {timesheet.fmComment && (
                              <p className="text-green-700 mt-1">{timesheet.fmComment}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredTimesheets.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredTimesheets.filter(t => t.status === 'Pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredTimesheets.filter(t => t.status === 'Submitted').length}
                </div>
                <div className="text-sm text-gray-600">Submitted</div>
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
    </div>
  );
}
