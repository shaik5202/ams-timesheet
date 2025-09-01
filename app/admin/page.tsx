'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Filter, Download, FileText, Search, RefreshCw, Clock, CheckCircle, XCircle, Calendar, User, FolderOpen } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import Navigation from '../../components/Navigation';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'PM' | 'FM' | 'ADMIN';
  createdAt?: string;
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

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' as User['role'] });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; role: User['role']; password: string }>({ name: '', role: 'EMPLOYEE', password: '' });
  
  // Timesheet filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const { toast } = useToast();

  // Mock user data for admin (in real app, this would come from auth context)
  const [currentUser] = useState({
    id: 'admin',
    name: 'Administrator',
    email: 'admin@example.com',
    role: 'ADMIN'
  });

  const fetchTimesheets = useCallback(async () => {
    try {
      const response = await fetch('/api/approvals');
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
    }
  }, [toast]);

  const applyTimesheetFilters = useCallback(() => {
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

    // Employee filter
    if (employeeFilter !== 'All') {
      filtered = filtered.filter(t => t.employeeId && t.employeeId.name && t.employeeId.name === employeeFilter);
    }

    setFilteredTimesheets(filtered);
  }, [timesheets, searchTerm, statusFilter, dateFilter, employeeFilter]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.status === 403) {
          router.push('/');
          return;
        }
        if (!res.ok) {
          setError('Failed to load users');
          return;
        }
        const data = await res.json();
        setUsers(data.users);
      } catch {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchTimesheets();
    }
  }, [activeTab, fetchTimesheets]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      applyTimesheetFilters();
    }
  }, [activeTab, applyTimesheetFilters]);

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Please fill all fields');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, userRole: form.role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create user');
        return;
      }
      setUsers((prev) => [data.user, ...prev]);
      setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' });
          } catch {
        setError('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const beginEdit = (u: User) => {
    setEditingId(u._id);
    setEditForm({ name: u.name, role: u.role, password: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError('');
    try {
      const res = await fetch(`/api/users/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, userRole: editForm.role, password: editForm.password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update user');
        return;
      }
      setUsers((prev) => prev.map((x) => (x._id === data.user._id ? { ...x, ...data.user } : x)));
      setEditingId(null);
      setEditForm({ name: '', role: 'EMPLOYEE', password: '' });
          } catch {
        setError('Failed to update user');
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Failed to delete user');
        return;
      }
      setUsers((prev) => prev.filter((x) => x._id !== id));
    } catch {
      setError('Failed to delete user');
    }
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

  const exportTimesheetsToExcel = () => {
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

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-timesheet-approvals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Timesheet data exported to CSV',
    });
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

  const exportTimesheetsToPDF = () => {
    try {
      // Import jsPDF dynamically to avoid SSR issues
      import('jspdf').then(({ default: jsPDF }) => {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text('Admin Timesheet Approvals Report', 20, 20);
        
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
        doc.save(`admin-timesheet-approvals-${new Date().toISOString().split('T')[0]}.pdf`);
        
        toast({
          title: 'PDF Export Successful',
          description: 'Timesheet data exported to PDF',
        });
      });
    } catch {
      toast({
        title: 'PDF Export Failed',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation 
        userRole={currentUser.role} 
        userName={currentUser.name} 
        onLogout={handleLogout} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6 mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="approvals">Approval History</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><UserPlus className="w-5 h-5 mr-2" />Create User</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="PM">PM</option>
                    <option value="FM">FM</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <button onClick={createUser} disabled={creating} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Users</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Password</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {editingId === u._id ? (
                            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="px-2 py-1 border border-gray-300 rounded" />
                          ) : (
                            u.name
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{u.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {editingId === u._id ? (
                            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as User['role'] })} className="px-2 py-1 border border-gray-300 rounded">
                              <option value="EMPLOYEE">EMPLOYEE</option>
                              <option value="PM">PM</option>
                              <option value="FM">FM</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          ) : (
                            u.role
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {editingId === u._id ? (
                            <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="px-2 py-1 border border-gray-300 rounded" placeholder="Leave blank to keep" />
                          ) : (
                            '********'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date((u.createdAt || Date.now())).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 space-x-2">
                          {editingId === u._id ? (
                            <>
                              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                              <button onClick={() => { setEditingId(null); setEditForm({ name: '', role: 'EMPLOYEE', password: '' }); }} className="px-3 py-1 border rounded">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => beginEdit(u)} className="px-3 py-1 border rounded">Edit</button>
                              <button onClick={() => deleteUser(u._id)} className="px-3 py-1 border rounded text-red-600">Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 p-6">
              <div className="flex items-center space-x-4 mb-4">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Employee</label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="All">All Employees</option>
                    {Array.from(new Set(timesheets
                      .filter(t => t.employeeId && t.employeeId.name)
                      .map(t => t.employeeId.name)
                    )).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('All');
                      setDateFilter('');
                      setEmployeeFilter('All');
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

            {/* Export Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                onClick={exportTimesheetsToExcel}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </Button>
              <Button
                onClick={exportTimesheetsToPDF}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </Button>
            </div>

            {/* Timesheets List */}
            <div className="space-y-4">
              {filteredTimesheets.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h3>
                  <p className="text-gray-500">No timesheets match your current filters.</p>
                </div>
              ) : (
                filteredTimesheets.map((timesheet) => (
                  <div
                    key={timesheet._id}
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
                    </div>
                  </div>
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
          </div>
        )}
      </main>
    </div>
  );
}


