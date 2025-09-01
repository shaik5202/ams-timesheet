'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Send } from 'lucide-react';

interface TimesheetLine {
  _id?: string;
  projectId: { _id: string; name: string; code: string } | string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
  lineTotal: number;
  comment?: string;
}

interface TimesheetHeader {
  _id: string;
  weekStart: string;
  weekEnd: string;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
  totalHours: number;
}

export default function TimesheetViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [header, setHeader] = useState<TimesheetHeader | null>(null);
  const [lines, setLines] = useState<TimesheetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timesheetId, setTimesheetId] = useState<string>('');

  useEffect(() => {
    const getParams = async () => {
      const { id } = await params;
      setTimesheetId(id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!timesheetId) return;
    
    const load = async () => {
      try {
        const res = await fetch(`/api/timesheets/${timesheetId}`);
        if (!res.ok) {
          router.push('/timesheets');
          return;
        }
        const data = await res.json();
        setHeader(data.header);
        setLines(data.lines);
      } catch (e) {
        setError('Failed to load timesheet');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [timesheetId, router]);

  const isEditable = useMemo(() => header?.status === 'Pending', [header?.status]);

  const updateLine = (index: number, field: keyof TimesheetLine, value: any) => {
    if (!isEditable) return;
    const newLines = [...lines];
    const current = { ...newLines[index] } as any;
    current[field] = value;
    current.lineTotal = (current.mon || 0) + (current.tue || 0) + (current.wed || 0) + (current.thu || 0) + (current.fri || 0) + (current.sat || 0) + (current.sun || 0);
    newLines[index] = current;
    setLines(newLines);
  };

  const getDayTotal = (day: keyof Pick<TimesheetLine, 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>) =>
    lines.reduce((sum, l) => sum + (l[day] || 0), 0);

  const getGrandTotal = () => lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);

  const saveOrSubmit = async (action: 'save' | 'submit') => {
    if (!header) return;
    if (action === 'submit') {
      const total = getGrandTotal();
      if (total > 84) {
        setError('Total hours cannot exceed 84 per week');
        return;
      }
    }
    setError('');
    action === 'save' ? setIsSaving(true) : setIsSubmitting(true);
    try {
      const res = await fetch(`/api/timesheets/${header._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ header, lines, action }),
      });
      if (res.ok) {
        router.push('/timesheets');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update timesheet');
      }
    } catch (e) {
      setError('An error occurred while updating');
    } finally {
      setIsSaving(false);
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

  if (!header) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
              <h1 className="text-xl font-bold text-gray-900">Timesheet</h1>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{new Date(header.weekStart).toLocaleDateString()} - {new Date(header.weekEnd).toLocaleDateString()}</p>
              <p className="text-xs text-gray-500 capitalize">{header.status.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {lines.map((line, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {typeof line.projectId === 'string' ? line.projectId : `${line.projectId.code} - ${line.projectId.name}`}
                    </td>
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => (
                      <td key={day} className="px-4 py-3">
                        {isEditable ? (
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={line[day]}
                            onChange={(e) => updateLine(index, day, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="text-center">{line[day]}</div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-medium text-gray-900">
                      {line.lineTotal}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {isEditable ? (
                        <input
                          type="text"
                          value={line.comment || ''}
                          onChange={(e) => updateLine(index, 'comment', e.target.value)}
                          placeholder="Optional comment (max 500 chars)"
                          maxLength={500}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="text-sm text-gray-700 break-words">{line.comment || '-'}</div>
                      )}
                    </td>
                  </tr>
                ))}

                <tr className="bg-blue-50/50 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Totals</td>
                  {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => (
                    <td key={day} className="px-4 py-3 text-center text-gray-700">
                      {getDayTotal(day)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center text-blue-700 text-lg font-bold">
                    {getGrandTotal()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg font-semibold text-gray-900">
            Grand Total: <span className="text-blue-600 text-xl">{getGrandTotal()}</span> hours
          </div>
          <div className="flex space-x-4">
            {isEditable && (
              <>
                <button
                  onClick={() => saveOrSubmit('save')}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save (Pending)'}</span>
                </button>
                <button
                  onClick={() => saveOrSubmit('submit')}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit (Submitted)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


