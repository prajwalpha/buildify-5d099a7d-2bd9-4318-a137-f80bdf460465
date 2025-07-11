
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Building2, 
  Gauge, 
  Receipt, 
  CreditCard, 
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    totalMeters: 0,
    totalBills: 0,
    pendingBills: 0,
    totalTransactions: 0,
    revenueToday: 0,
    revenueThisMonth: 0
  });

  // Fetch dashboard stats
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin_dashboard'],
    queryFn: async () => {
      // In a real app, this would be a single API call to get all stats
      // For now, we'll return mock data
      return {
        totalUsers: 42,
        totalClients: 8,
        totalMeters: 156,
        totalBills: 324,
        pendingBills: 18,
        totalTransactions: 512,
        revenueToday: 12500,
        revenueThisMonth: 185000
      };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (dashboardData) {
      setStats(dashboardData);
    }
  }, [dashboardData]);

  return (
    <DashboardLayout title="Admin Dashboard" adminLayout>
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <Users className="mr-1 h-4 w-4" />
                <span>Registered users</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Clients</CardDescription>
              <CardTitle className="text-3xl">{stats.totalClients}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <Building2 className="mr-1 h-4 w-4" />
                <span>Organizations</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Meters</CardDescription>
              <CardTitle className="text-3xl">{stats.totalMeters}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <Gauge className="mr-1 h-4 w-4" />
                <span>Active meters</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue (This Month)</CardDescription>
              <CardTitle className="text-3xl">₹{stats.revenueThisMonth.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <CreditCard className="mr-1 h-4 w-4" />
                <span>Today: ₹{stats.revenueToday.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/admin/clients">
              <Building2 className="mr-2 h-4 w-4" /> Manage Clients
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/meters">
              <Gauge className="mr-2 h-4 w-4" /> Manage Meters
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/billing">
              <Receipt className="mr-2 h-4 w-4" /> Billing
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/reports">
              <Receipt className="mr-2 h-4 w-4" /> Reports
            </Link>
          </Button>
        </div>

        {/* Placeholder for future content */}
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 border-b pb-4">
                <div className="p-2 rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-medium">Low Balance Meters</h3>
                  <p className="text-muted-foreground">
                    12 meters have low balance and need attention
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">View</Button>
              </div>
              
              <div className="flex items-start gap-4 border-b pb-4">
                <div className="p-2 rounded-full bg-yellow-100">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-medium">Pending Bills</h3>
                  <p className="text-muted-foreground">
                    {stats.pendingBills} bills are pending payment
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">View</Button>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-orange-100">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-medium">Inactive Meters</h3>
                  <p className="text-muted-foreground">
                    8 meters are inactive or in maintenance
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">View</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;