'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, Send, Calendar } from 'lucide-react';
import Navigation from '../../components/Navigation';

interface Project {
  _id: string;
  name: string;
  code: string;
}

interface TimesheetLine {
  _id?: string;
  projectId: string;
  sat: number;
  sun: number;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  lineTotal: number;
  comment?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function PreapprovalPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'last'>('current');
  const [lines, setLines] = useState<TimesheetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

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

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?type=preapproval');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

    checkAuth();
    fetchProjects();
    setIsLoading(false);
  }, [router]);

  const getWeekDates = (weekType: 'current' | 'last') => {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    
    if (weekType === 'current') {
      return {
        start: currentWeekStart,
        end: new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
      };
    } else {
      const lastWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: lastWeekStart,
        end: new Date(lastWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
      };
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Saturday is 6, so we need to adjust the calculation
    const diff = d.getDate() - day + (day === 6 ? 0 : day < 6 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    // Normalize to start of day to avoid timezone mismatches
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const addProjectRow = () => {
    if (lines.length >= 10) {
      setError('Maximum 10 project rows allowed');
      return;
    }

    const newLine: TimesheetLine = {
      projectId: '',
      sat: 0,
      sun: 0,
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      lineTotal: 0,
      comment: '',
    };

    setLines([...lines, newLine]);
  };

  const removeProjectRow = (index: number) => {
    if (lines.length <= 1) {
      setError('At least one project row is required');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof TimesheetLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Calculate line total
    if (['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'].includes(field)) {
      const total = newLines[index].sat + newLines[index].sun + newLines[index].mon + 
                   newLines[index].tue + newLines[index].wed + newLines[index].thu + newLines[index].fri;
      newLines[index].lineTotal = total;
    }
    
    setLines(newLines);
  };

  const getTotalHours = () => {
    return lines.reduce((sum, line) => sum + line.lineTotal, 0);
  };

  const getDayTotal = (day: keyof Pick<TimesheetLine, 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri'>) => {
    return lines.reduce((sum, line) => sum + (line[day] || 0), 0);
  };

  const validateForm = () => {
    if (lines.length === 0) {
      setError('At least one project row is required');
      return false;
    }

    for (const line of lines) {
      if (!line.projectId) {
        setError('All projects must be selected');
        return false;
      }
      
      // Check line total (individual project line)
      if (line.lineTotal > 10) {
        setError(`Line total for each project cannot exceed 10 hours. Current line total: ${line.lineTotal} hours`);
        return false;
      }
    }

    const totalHours = getTotalHours();
    if (totalHours > 60) {
      setError('Grand total hours cannot exceed 60 per week');
      return false;
    }

    // Per-day limit across all lines: 10 hours
    const days: Array<keyof Pick<TimesheetLine, 'sat'|'sun'|'mon'|'tue'|'wed'|'thu'|'fri'>> = ['sat','sun','mon','tue','wed','thu','fri'];
    for (const day of days) {
      const total = getDayTotal(day);
      if (total > 10) {
        setError(`Total hours for ${day.toUpperCase()} cannot exceed 10`);
        return false;
      }
    }

    return true;
  };

  // Pure validation utility for render-time checks (no state updates)
  const isFormValid = () => {
    if (lines.length === 0) return false;
    for (const line of lines) {
      if (!line.projectId) return false;
      // Check line total (individual project line)
      if (line.lineTotal > 10) return false;
    }
    const totalHours = getTotalHours();
    if (totalHours > 60) return false;
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const weekDates = getWeekDates(selectedWeek);
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          header: {
            weekStart: weekDates.start,
            weekEnd: weekDates.end,
          },
          lines,
          action: 'save',
        }),
      });

      if (response.ok) {
        setSuccess('Timesheet saved successfully');
        setTimeout(() => {
          router.push('/timesheets');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save timesheet');
      }
    } catch (error) {
      setError('Failed to save timesheet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const weekDates = getWeekDates(selectedWeek);
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          header: {
            weekStart: weekDates.start,
            weekEnd: weekDates.end,
          },
          lines,
          action: 'submit',
        }),
      });

      if (response.ok) {
        setSuccess('Timesheet submitted successfully');
        setTimeout(() => {
          router.push('/timesheets');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit timesheet');
      }
    } catch (error) {
      setError('Failed to submit timesheet');
    } finally {
      setIsSubmitting(false);
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

  const weekDates = getWeekDates(selectedWeek);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation 
        userRole={user.role} 
        userName={user.name} 
        onLogout={() => router.push('/login')} 
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <div className="w-px h-6 bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Pre-Approval Timesheet Entry</h1>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Week Selection */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 mb-8">
          <div className="flex items-center space-x-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <label className="text-sm font-medium text-gray-700">Select Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value as 'current' | 'last')}
                className="ml-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="current">Current Week</option>
                <option value="last">Last Week</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              {weekDates.start.toLocaleDateString()} - {weekDates.end.toLocaleDateString()}
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Pre-Approval Mode:</strong> This timesheet will be routed to the assigned Project Manager and Functional Manager based on the selected projects.
            </p>
          </div>
        </div>

        {/* Timesheet Grid */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Project</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Sat</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Sun</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Mon</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Tue</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Wed</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Thu</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Fri</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Line Total
                    <div className="text-xs text-gray-500 font-normal">(Max: 10)</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Comment</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <select
                        value={line.projectId}
                        onChange={(e) => updateLine(index, 'projectId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Project</option>
                        {projects.map((project) => (
                          <option key={project._id} value={project._id}>
                            {project.code} - {project.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.sat}
                        onChange={(e) => updateLine(index, 'sat', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.sun}
                        onChange={(e) => updateLine(index, 'sun', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.mon}
                        onChange={(e) => updateLine(index, 'mon', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.tue}
                        onChange={(e) => updateLine(index, 'tue', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.wed}
                        onChange={(e) => updateLine(index, 'wed', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.thu}
                        onChange={(e) => updateLine(index, 'thu', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={line.fri}
                        onChange={(e) => updateLine(index, 'fri', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      <span className={line.lineTotal > 10 ? 'text-red-600 font-bold' : 'text-gray-900'}>
                        {line.lineTotal}
                      </span>
                      {line.lineTotal > 10 && (
                        <div className="text-xs text-red-500 mt-1">Max: 10</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={line.comment || ''}
                        onChange={(e) => updateLine(index, 'comment', e.target.value)}
                        placeholder="Optional comment"
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeProjectRow(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-blue-50/50 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totals</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('sat')}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('sun')}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('mon')}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('tue')}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('wed')}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('thu')}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{getDayTotal('fri')}</td>
                  <td className="px-4 py-3 text-center text-blue-700 text-lg font-bold">
                    {getTotalHours()}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Add Project Row Button */}
          <div className="p-4 border-t border-gray-200/50">
            <button
              onClick={addProjectRow}
              disabled={lines.length >= 10}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project Row</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className={`text-2xl font-bold ${getTotalHours() > 60 ? 'text-red-600' : 'text-blue-600'}`}>
                {getTotalHours()}/60
              </p>
              <p className="text-xs text-gray-500">Max: 60 per week</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Week Range</p>
              <p className="text-lg font-medium text-gray-900">
                {weekDates.start.toLocaleDateString()} - {weekDates.end.toLocaleDateString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Line Limits</p>
              <p className="text-lg font-medium text-gray-900">Max: 10 per line</p>
              <p className="text-xs text-gray-500">Per project</p>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg font-semibold text-gray-900">
            Grand Total: <span className={`text-xl ${getTotalHours() > 60 ? 'text-red-600' : 'text-blue-600'}`}>{getTotalHours()}</span>/60 hours
            <span className="text-sm text-gray-500 ml-2">(Max: 10 per line, 60 per week)</span>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !isFormValid()}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save (Pending)'}</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid()}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit (Submitted)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
