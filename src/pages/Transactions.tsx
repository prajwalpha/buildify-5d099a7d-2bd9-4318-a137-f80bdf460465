
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { supabase } from '@/lib/supabase';
import { Transaction, Meter, TransactionType } from '@/types';
import { Search, Download, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

const Transactions = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const meterIdParam = searchParams.get('meter');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [selectedMeter, setSelectedMeter] = useState<string>(meterIdParam || 'all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Fetch user's meters
  const { data: meters = [] } = useQuery<Meter[]>({
    queryKey: ['meters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meters')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', user?.id, selectedMeter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, meter:meters(meter_number, meter_type, premises(name)), bill:bills(bill_number)')
        .eq('user_id', user?.id || '');
      
      if (selectedMeter !== 'all') {
        query = query.eq('meter_id', selectedMeter);
      }
      
      if (dateRange?.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte('transaction_date', fromDate.toISOString());
      }
      
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('transaction_date', toDate.toISOString());
      }
      
      const { data, error } = await query.order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter and sort transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const searchMatch = 
      transaction.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.meter?.meter_number && transaction.meter.meter_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.bill?.bill_number && transaction.bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Type filter
    const typeMatch = filterType === 'all' || transaction.transaction_type === filterType;
    
    // Status filter
    const statusMatch = filterStatus === 'all' || transaction.status === filterStatus;
    
    return searchMatch && typeMatch && statusMatch;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
    } else if (sortBy === 'amount') {
      return b.amount - a.amount;
    }
    return 0;
  });

  // Calculate statistics
  const totalTransactions = transactions.length;
  const totalRecharges = transactions.filter(t => t.transaction_type === 'recharge').length;
  const totalPayments = transactions.filter(t => t.transaction_type === 'payment').length;
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

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

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <DashboardLayout title="Transactions">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recharges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecharges}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bill Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPayments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <DatePickerWithRange 
              className="w-full sm:w-auto"
              selected={dateRange}
              onSelect={setDateRange}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={selectedMeter} onValueChange={(value) => {
              setSelectedMeter(value);
              if (value !== 'all') {
                setSearchParams({ meter: value });
              } else {
                searchParams.delete('meter');
                setSearchParams(searchParams);
              }
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select meter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Meters</SelectItem>
                {meters.map((meter) => (
                  <SelectItem key={meter.id} value={meter.id}>
                    {meter.meter_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="recharge">Recharges</SelectItem>
                <SelectItem value="payment">Bill Payments</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="ml-auto" disabled={transactions.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sortedTransactions.length > 0 ? (
            sortedTransactions.map((transaction) => {
              const { icon, color } = getTransactionStyle(transaction.transaction_type);
              return (
                <Card key={transaction.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className={`p-6 flex items-center justify-center ${color} sm:w-16`}>
                      {icon}
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {transaction.transaction_type === 'recharge' 
                                ? 'Recharge' 
                                : transaction.transaction_type === 'payment' 
                                  ? `Payment for ${transaction.bill?.bill_number || 'bill'}`
                                  : 'Refund'}
                            </h3>
                            <Badge variant={getStatusVariant(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {transaction.transaction_number} • 
                            {format(new Date(transaction.transaction_date), 'PPp')}
                          </p>
                          {transaction.meter && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Meter: {transaction.meter.meter_number} • 
                              {transaction.meter.premises?.name 
                                ? ` ${transaction.meter.premises.name}` 
                                : ' Unknown location'}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${transaction.transaction_type === 'payment' ? 'text-red-500' : 'text-green-500'}`}>
                            {transaction.transaction_type === 'payment' ? '-' : '+'} ₹{transaction.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {transaction.payment_method || 'Card'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No transactions found matching your filters</p>
              <Button onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterStatus('all');
                setSelectedMeter('all');
                setDateRange(undefined);
                searchParams.delete('meter');
                setSearchParams(searchParams);
              }}>
                Clear Filters
              </Button>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;