
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Meter, MeterReading, Bill, Transaction } from '@/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  Zap, 
  Droplet, 
  Flame, 
  AlertTriangle, 
  CreditCard, 
  Receipt, 
  Clock, 
  Settings, 
  ArrowLeft,
  Calendar,
  FileText,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';

const MeterDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isRechargeDialogOpen, setIsRechargeDialogOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Fetch meter details
  const { data: meter, isLoading: isLoadingMeter } = useQuery<Meter>({
    queryKey: ['meter', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meters')
        .select('*, premises(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch meter readings
  const { data: readings = [], isLoading: isLoadingReadings } = useQuery<MeterReading[]>({
    queryKey: ['meter_readings', id, selectedTimeRange],
    queryFn: async () => {
      let query = supabase
        .from('meter_readings')
        .select('*')
        .eq('meter_id', id)
        .order('reading_date', { ascending: true });
      
      // Apply time range filter
      const now = new Date();
      let startDate = new Date();
      
      if (selectedTimeRange === '7d') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedTimeRange === '30d') {
        startDate.setDate(now.getDate() - 30);
      } else if (selectedTimeRange === '90d') {
        startDate.setDate(now.getDate() - 90);
      } else if (selectedTimeRange === '1y') {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      
      query = query.gte('reading_date', startDate.toISOString());
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch bills
  const { data: bills = [], isLoading: isLoadingBills } = useQuery<Bill[]>({
    queryKey: ['bills', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('meter_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('meter_id', id)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Handle recharge submission
  const handleRecharge = async () => {
    if (!user || !meter || !rechargeAmount || parseFloat(rechargeAmount) <= 0) return;
    
    try {
      // Generate a unique transaction number
      const transactionNumber = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a new transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          user_id: user.id,
          meter_id: meter.id,
          transaction_type: 'recharge',
          amount: parseFloat(rechargeAmount),
          payment_method: 'credit_card', // This would be selected by the user in a real app
          status: 'completed', // In a real app, this would be 'pending' until payment is confirmed
          transaction_date: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      // Close the dialog and reset form
      setIsRechargeDialogOpen(false);
      setRechargeAmount('');
      
      // Refetch meter data to show updated balance
      // In a real app, the balance update would happen via a database trigger
      // and we would refetch the meter data after payment confirmation
    } catch (error) {
      console.error('Error processing recharge:', error);
    }
  };

  // Format readings data for chart
  const chartData = readings.map(reading => ({
    date: format(new Date(reading.reading_date), 'MMM dd'),
    reading: reading.reading,
    consumption: reading.consumption || 0
  }));

  // Get icon by meter type
  const getMeterIcon = (type?: string) => {
    switch (type) {
      case 'electricity':
        return <Zap className="h-6 w-6" />;
      case 'water':
        return <Droplet className="h-6 w-6" />;
      case 'gas':
        return <Flame className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  // Get color by meter type
  const getMeterColor = (type?: string) => {
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

  // Get status badge variant
  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'maintenance':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get unit by meter type
  const getUnit = (type?: string) => {
    switch (type) {
      case 'electricity':
        return 'kWh';
      case 'water':
        return 'kL';
      case 'gas':
        return 'm³';
      default:
        return 'units';
    }
  };

  if (isLoadingMeter) {
    return (
      <DashboardLayout title="Meter Details">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!meter) {
    return (
      <DashboardLayout title="Meter Details">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Meter Not Found</h2>
          <p className="text-muted-foreground mb-6">The meter you're looking for doesn't exist or you don't have access to it.</p>
          <Button asChild>
            <Link to="/meters">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Meters
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Meter Details">
      <div className="space-y-6">
        {/* Back button */}
        <div>
          <Button variant="outline" asChild>
            <Link to="/meters">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Meters
            </Link>
          </Button>
        </div>

        {/* Meter header */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className={`p-6 rounded-lg ${getMeterColor(meter.meter_type)} flex items-center justify-center`}>
            {getMeterIcon(meter.meter_type)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{meter.meter_number}</h1>
              <Badge variant={getStatusVariant(meter.status)}>
                {meter.status}
              </Badge>
              <Badge variant="outline">{meter.billing_type}</Badge>
            </div>
            <p className="text-muted-foreground mb-4">
              {meter.premises?.name || 'Unknown location'} • {meter.premises?.address || 'No address'}
            </p>
            <div className="flex flex-wrap gap-4">
              {meter.billing_type === 'prepaid' && (
                <Button onClick={() => setIsRechargeDialogOpen(true)}>
                  <CreditCard className="mr-2 h-4 w-4" /> Recharge
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to={`/bills?meter=${meter.id}`}>
                  <Receipt className="mr-2 h-4 w-4" /> View Bills
                </Link>
              </Button>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" /> Configure Alerts
              </Button>
            </div>
          </div>
          <Card className="md:w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {meter.billing_type === 'prepaid' ? 'Current Balance' : 'Last Bill'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {meter.billing_type === 'prepaid' ? (
                <div className="flex flex-col">
                  <div className={`text-3xl font-bold ${meter.current_balance < (meter.threshold_limit || 100) ? 'text-red-500' : ''}`}>
                    ₹{meter.current_balance.toFixed(2)}
                  </div>
                  {meter.current_balance < (meter.threshold_limit || 100) && (
                    <div className="flex items-center text-red-500 mt-1">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span className="text-sm">Low balance</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  {bills.length > 0 ? (
                    <>
                      <div className="text-3xl font-bold">₹{bills[0].total_amount.toFixed(2)}</div>
                      <div className="flex items-center text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span className="text-sm">Due: {new Date(bills[0].due_date).toLocaleDateString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">No bills yet</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="consumption">
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="consumption">Consumption</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          
          {/* Consumption tab */}
          <TabsContent value="consumption" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Consumption History</h2>
              <div className="flex gap-2">
                <Button 
                  variant={selectedTimeRange === '7d' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedTimeRange('7d')}
                >
                  7D
                </Button>
                <Button 
                  variant={selectedTimeRange === '30d' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedTimeRange('30d')}
                >
                  30D
                </Button>
                <Button 
                  variant={selectedTimeRange === '90d' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedTimeRange('90d')}
                >
                  90D
                </Button>
                <Button 
                  variant={selectedTimeRange === '1y' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setSelectedTimeRange('1y')}
                >
                  1Y
                </Button>
              </div>
            </div>
            
            {isLoadingReadings ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : readings.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="reading" name={`Reading (${getUnit(meter.meter_type)})`} fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="consumption" name={`Consumption (${getUnit(meter.meter_type)})`} fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No consumption data available for the selected period</p>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Readings</CardTitle>
              </CardHeader>
              <CardContent>
                {readings.length > 0 ? (
                  <div className="space-y-4">
                    {readings.slice().reverse().slice(0, 5).map((reading) => (
                      <div key={reading.id} className="flex justify-between items-center border-b pb-4">
                        <div>
                          <p className="font-medium">{new Date(reading.reading_date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {reading.is_manual ? 'Manual reading' : 'Automatic reading'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{reading.reading} {getUnit(meter.meter_type)}</p>
                          {reading.consumption !== null && (
                            <p className="text-sm text-muted-foreground">
                              Consumption: {reading.consumption} {getUnit(meter.meter_type)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">No readings available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Bills tab */}
          <TabsContent value="bills" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Billing History</h2>
              {meter.billing_type === 'postpaid' && (
                <Button asChild>
                  <Link to={`/bills?meter=${meter.id}`}>
                    <FileText className="mr-2 h-4 w-4" /> View All Bills
                  </Link>
                </Button>
              )}
            </div>
            
            {isLoadingBills ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : meter.billing_type === 'prepaid' ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">This is a prepaid meter. No bills are generated.</p>
              </Card>
            ) : bills.length > 0 ? (
              <div className="space-y-4">
                {bills.map((bill) => (
                  <Card key={bill.id}>
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{bill.bill_number}</h3>
                              <Badge variant={bill.status === 'completed' ? 'success' : bill.status === 'pending' ? 'outline' : 'destructive'}>
                                {bill.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">
                              Period: {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="font-bold text-lg">₹{bill.total_amount.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              Due: {new Date(bill.due_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Consumption:</span> {bill.consumption} {getUnit(meter.meter_type)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rate:</span> ₹{bill.rate}/{getUnit(meter.meter_type)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span> ₹{bill.amount.toFixed(2)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tax:</span> ₹{bill.tax_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex justify-end items-end border-t md:border-t-0 md:border-l">
                        {bill.status === 'pending' ? (
                          <Button>Pay Now</Button>
                        ) : (
                          <Button variant="outline" asChild>
                            <Link to={`/bills/${bill.id}`}>View Details</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No bills have been generated yet</p>
              </Card>
            )}
          </TabsContent>
          
          {/* Transactions tab */}
          <TabsContent value="transactions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <Button asChild>
                <Link to={`/transactions?meter=${meter.id}`}>
                  <Clock className="mr-2 h-4 w-4" /> View All Transactions
                </Link>
              </Button>
            </div>
            
            {isLoadingTransactions ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : transactions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center border-b pb-4">
                        <div>
                          <p className="font-medium">
                            {transaction.transaction_type === 'recharge' 
                              ? 'Recharge' 
                              : transaction.transaction_type === 'payment' 
                                ? 'Bill Payment' 
                                : 'Refund'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.transaction_date).toLocaleDateString()} • {transaction.transaction_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${transaction.transaction_type === 'payment' ? 'text-red-500' : 'text-green-500'}`}>
                            {transaction.transaction_type === 'payment' ? '-' : '+'} ₹{transaction.amount.toFixed(2)}
                          </p>
                          <Badge variant={transaction.status === 'completed' ? 'success' : transaction.status === 'pending' ? 'outline' : 'destructive'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No transactions found for this meter</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Recharge dialog */}
      <Dialog open={isRechargeDialogOpen} onOpenChange={setIsRechargeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Meter</DialogTitle>
            <DialogDescription>
              Enter the amount you want to add to your meter balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className="justify-start">
                  <CreditCard className="mr-2 h-4 w-4" /> Card
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <img src="/upi-icon.svg" alt="UPI" className="mr-2 h-4 w-4" /> UPI
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <img src="/netbanking-icon.svg" alt="Netbanking" className="mr-2 h-4 w-4" /> Netbanking
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRechargeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecharge} disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0}>
              Proceed to Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MeterDetail;