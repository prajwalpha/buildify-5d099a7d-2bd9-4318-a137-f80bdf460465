
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Meter, MeterReading, Transaction, Bill, ConsumptionData, DashboardStats } from '@/types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Gauge, 
  Receipt, 
  CreditCard, 
  AlertTriangle,
  Zap,
  Droplet,
  Flame,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMeters: 0,
    activeMeters: 0,
    totalBills: 0,
    pendingBills: 0,
    totalTransactions: 0,
    recentTransactions: [],
    recentReadings: [],
    consumptionTrend: []
  });

  // Fetch user's meters
  const { data: meters = [] } = useQuery<Meter[]>({
    queryKey: ['meters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meters')
        .select('*, premises(*)')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent meter readings
  const { data: readings = [] } = useQuery<MeterReading[]>({
    queryKey: ['meter_readings', user?.id],
    queryFn: async () => {
      if (!meters.length) return [];
      
      const meterIds = meters.map(meter => meter.id);
      const { data, error } = await supabase
        .from('meter_readings')
        .select('*, meter:meters(meter_number, meter_type)')
        .in('meter_id', meterIds)
        .order('reading_date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!meters.length,
  });

  // Fetch bills
  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ['bills', user?.id],
    queryFn: async () => {
      if (!meters.length) return [];
      
      const meterIds = meters.map(meter => meter.id);
      const { data, error } = await supabase
        .from('bills')
        .select('*, meter:meters(meter_number, meter_type)')
        .in('meter_id', meterIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!meters.length,
  });

  // Fetch transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, meter:meters(meter_number, meter_type), bill:bills(bill_number)')
        .eq('user_id', user?.id || '')
        .order('transaction_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Generate consumption trend data
  const generateConsumptionTrend = () => {
    if (!readings.length) return [];

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Group readings by date and meter type
    const readingsByDate = readings
      .filter(reading => new Date(reading.reading_date) >= last30Days)
      .reduce((acc, reading) => {
        const date = new Date(reading.reading_date).toISOString().split('T')[0];
        const meterType = reading.meter?.meter_type || 'electricity';
        
        if (!acc[date]) {
          acc[date] = { electricity: 0, water: 0, gas: 0 };
        }
        
        acc[date][meterType] += reading.consumption || 0;
        
        return acc;
      }, {} as Record<string, { electricity: number, water: number, gas: number }>);

    // Convert to array format for chart
    return Object.entries(readingsByDate).map(([date, values]) => ({
      date,
      electricity: values.electricity,
      water: values.water,
      gas: values.gas
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Update dashboard stats
  useEffect(() => {
    const pendingBills = bills.filter(bill => bill.status === 'pending');
    const activeMeters = meters.filter(meter => meter.status === 'active');
    const consumptionTrend = generateConsumptionTrend();

    setStats({
      totalMeters: meters.length,
      activeMeters: activeMeters.length,
      totalBills: bills.length,
      pendingBills: pendingBills.length,
      totalTransactions: transactions.length,
      recentTransactions: transactions,
      recentReadings: readings.slice(0, 5),
      consumptionTrend
    });
  }, [meters, readings, bills, transactions]);

  // Calculate total balance across all prepaid meters
  const totalPrepaidBalance = meters
    .filter(meter => meter.billing_type === 'prepaid')
    .reduce((total, meter) => total + meter.current_balance, 0);

  // Get meters with low balance
  const lowBalanceMeters = meters.filter(meter => 
    meter.billing_type === 'prepaid' && 
    meter.current_balance < (meter.threshold_limit || 100)
  );

  // Format consumption data for charts
  const consumptionByType = {
    electricity: 0,
    water: 0,
    gas: 0
  };

  readings.forEach(reading => {
    if (reading.meter?.meter_type && reading.consumption) {
      consumptionByType[reading.meter.meter_type] += reading.consumption;
    }
  });

  const consumptionData = [
    { name: 'Electricity', value: consumptionByType.electricity, color: '#f97316' },
    { name: 'Water', value: consumptionByType.water, color: '#0ea5e9' },
    { name: 'Gas', value: consumptionByType.gas, color: '#8b5cf6' }
  ];

  // Get icon by meter type
  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'electricity':
        return <Zap className="h-4 w-4" />;
      case 'water':
        return <Droplet className="h-4 w-4" />;
      case 'gas':
        return <Flame className="h-4 w-4" />;
      default:
        return <Gauge className="h-4 w-4" />;
    }
  };

  // Get color by meter type
  const getMeterColor = (type: string) => {
    switch (type) {
      case 'electricity':
        return 'text-orange-500 bg-orange-100';
      case 'water':
        return 'text-blue-500 bg-blue-100';
      case 'gas':
        return 'text-purple-500 bg-purple-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  // Get transaction icon and color
  const getTransactionStyle = (type: string) => {
    switch (type) {
      case 'recharge':
        return { icon: <ArrowUpRight className="h-4 w-4 text-green-500" />, color: 'bg-green-100' };
      case 'payment':
        return { icon: <ArrowDownRight className="h-4 w-4 text-red-500" />, color: 'bg-red-100' };
      case 'refund':
        return { icon: <ArrowUpRight className="h-4 w-4 text-blue-500" />, color: 'bg-blue-100' };
      default:
        return { icon: <CreditCard className="h-4 w-4 text-gray-500" />, color: 'bg-gray-100' };
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6">
        {/* Summary cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Meters</CardDescription>
              <CardTitle className="text-3xl">{stats.totalMeters}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <Gauge className="mr-1 h-4 w-4" />
                <span>{stats.activeMeters} active meters</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Prepaid Balance</CardDescription>
              <CardTitle className="text-3xl">₹{totalPrepaidBalance.toFixed(2)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <CreditCard className="mr-1 h-4 w-4" />
                <span>Across all prepaid meters</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Bills</CardDescription>
              <CardTitle className="text-3xl">{stats.pendingBills}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <Receipt className="mr-1 h-4 w-4" />
                <span>Bills awaiting payment</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className={lowBalanceMeters.length > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className={lowBalanceMeters.length > 0 ? "text-red-500" : ""}>
                Low Balance Alerts
              </CardDescription>
              <CardTitle className={`text-3xl ${lowBalanceMeters.length > 0 ? "text-red-500" : ""}`}>
                {lowBalanceMeters.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center ${lowBalanceMeters.length > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                <AlertTriangle className="mr-1 h-4 w-4" />
                <span>Meters need recharge</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link to="/recharge">
              <CreditCard className="mr-2 h-4 w-4" /> Recharge Meter
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/bills">
              <Receipt className="mr-2 h-4 w-4" /> View Bills
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/meters">
              <Gauge className="mr-2 h-4 w-4" /> Manage Meters
            </Link>
          </Button>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Consumption Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.consumptionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="electricity" stroke="#f97316" name="Electricity" />
                    <Line type="monotone" dataKey="water" stroke="#0ea5e9" name="Water" />
                    <Line type="monotone" dataKey="gas" stroke="#8b5cf6" name="Gas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Consumption by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Consumption">
                      {consumptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Meters</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link to="/meters">
                <Plus className="mr-2 h-4 w-4" /> View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meters.length > 0 ? (
                meters.slice(0, 3).map((meter) => (
                  <div key={meter.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${getMeterColor(meter.meter_type)}`}>
                        {getMeterIcon(meter.meter_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{meter.meter_number}</p>
                          <Badge variant={meter.status === 'active' ? 'outline' : 'secondary'}>
                            {meter.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {meter.premises?.name || 'Unknown location'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {meter.billing_type === 'prepaid' 
                          ? `Balance: ₹${meter.current_balance.toFixed(2)}` 
                          : `Postpaid`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last reading: {meter.last_reading} {meter.meter_type === 'electricity' ? 'kWh' : meter.meter_type === 'water' ? 'kL' : 'm³'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No meters found</p>
                  <Button asChild>
                    <Link to="/meters">Add Meter</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link to="/transactions">
                <Plus className="mr-2 h-4 w-4" /> View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((transaction) => {
                  const { icon, color } = getTransactionStyle(transaction.transaction_type);
                  return (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${color}`}>
                          {icon}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.transaction_type === 'recharge' 
                              ? 'Recharge' 
                              : transaction.transaction_type === 'payment' 
                                ? `Payment for ${transaction.bill?.bill_number || 'bill'}`
                                : 'Refund'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {transaction.transaction_type === 'payment' ? '-' : '+'} ₹{transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.meter?.meter_number || 'N/A'}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-4">No recent transactions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

export default Dashboard;