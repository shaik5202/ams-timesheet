'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Clock, FileText, CheckCircle, Shield, Home, LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface NavigationProps {
  userRole: string;
  userName: string;
  onLogout: () => void;
}

export default function Navigation({ userRole, userName, onLogout }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const canAccessApprovals = ['PM', 'FM', 'ADMIN'].includes(userRole);
  const isAdmin = userRole === 'ADMIN';

  const navItems = [
    { path: '/', label: 'Home', icon: Home, show: true },
    { path: '/timesheets', label: 'My Timesheets', icon: Clock, show: true },
    { path: '/timesheets/new', label: 'New Timesheet', icon: FileText, show: true },
    { path: '/approvals', label: 'Approvals', icon: CheckCircle, show: canAccessApprovals },
    { path: '/preapproval', label: 'Preapproval', icon: FileText, show: canAccessApprovals },
    { path: '/admin', label: 'Admin Panel', icon: Shield, show: isAdmin },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ASM Attendance</h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-1">
              {navItems.filter(item => item.show).map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => router.push(item.path)}
                    className={`flex items-center space-x-2 ${
                      isActive 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">Welcome, {userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</p>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}



