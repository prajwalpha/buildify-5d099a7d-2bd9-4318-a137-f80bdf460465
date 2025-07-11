
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Bill, Meter, MeterType } from '@/types';
import { Search, Filter, ArrowUpDown, Zap, Droplet, Flame, FileText, Download, Calendar } from 'lucide-react';

const Bills = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const meterIdParam = searchParams.get('meter');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [filterMeterType, setFilterMeterType] = useState<MeterType | 'all'>('all');
  const [selectedMeter, setSelectedMeter] = useState<string>(meterIdParam || 'all');

  // Fetch user's meters
  const { data: meters = [] } = useQuery<Meter[]>({
    queryKey: ['meters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meters')
        .select('*')
        .eq('user_id', user?.id || '')
        .eq('billing_type', 'postpaid')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch bills
  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ['bills', user?.id, selectedMeter],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select('*, meter:meters(meter_number, meter_type, premises(name, address))');
      
      if (selectedMeter !== 'all') {
        query = query.eq('meter_id', selectedMeter);
      } else {
        // Get all bills for meters owned by the user
        const meterIds = meters.map(meter => meter.id);
        if (meterIds.length > 0) {
          query = query.in('meter_id', meterIds);
        } else {
          return []; // No meters, so no bills
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && (!!meters.length || selectedMeter !== 'all'),
  });

  // Filter and sort bills
  const filteredBills = bills.filter(bill => {
    // Search filter
    const searchMatch = 
      bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.meter?.meter_number && bill.meter.meter_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.meter?.premises?.name && bill.meter.premises.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const statusMatch = filterStatus === 'all' || bill.status === filterStatus;
    
    // Meter type filter
    const typeMatch = filterMeterType === 'all' || bill.meter?.meter_type === filterMeterType;
    
    return searchMatch && statusMatch && typeMatch;
  });

  // Sort bills
  const sortedBills = [...filteredBills].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'amount') {
      return b.total_amount - a.total_amount;
    }
    return 0;
  });

  // Calculate statistics
  const totalBills = bills.length;
  const pendingBills = bills.filter(bill => bill.status === 'pending').length;
  const totalAmount = bills.reduce((sum, bill) => sum + bill.total_amount, 0);
  const pendingAmount = bills
    .filter(bill => bill.status === 'pending')
    .reduce((sum, bill) => sum + bill.total_amount, 0);

  // Get icon by meter type
  const getMeterIcon = (type?: string) => {
    switch (type) {
      case 'electricity':
        return <Zap className="h-4 w-4" />;
      case 'water':
        return <Droplet className="h-4 w-4" />;
      case 'gas':
        return <Flame className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get color by meter type
  const getMeterColor = (type?: string) => {
    switch (type) {
      case 'electricity':
        return 'text-orange-500';
      case 'water':
        return 'text-blue-500';
      case 'gas':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
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
    <DashboardLayout title="Bills">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBills}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBills}</div>
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
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{pendingAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bills..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            
            <Select value={filterMeterType} onValueChange={(value) => setFilterMeterType(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Meter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="gas">Gas</SelectItem>
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
          </div>
        </div>

        {/* Bills list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sortedBills.length > 0 ? (
            sortedBills.map((bill) => (
              <Card key={bill.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{bill.bill_number}</h3>
                          <Badge variant={getStatusVariant(bill.status)}>
                            {bill.status}
                          </Badge>
                          {bill.meter?.meter_type && (
                            <div className={`flex items-center gap-1 ${getMeterColor(bill.meter.meter_type)}`}>
                              {getMeterIcon(bill.meter.meter_type)}
                              <span className="text-xs">{bill.meter.meter_type}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {bill.meter?.meter_number || 'Unknown meter'} • 
                          {bill.meter?.premises?.name 
                            ? ` ${bill.meter.premises.name}` 
                            : ' Unknown location'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Period: {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}</span>
                          </div>
                          <div>
                            Due: {new Date(bill.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-lg">₹{bill.total_amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          Consumption: {bill.consumption} {bill.meter?.meter_type === 'electricity' ? 'kWh' : bill.meter?.meter_type === 'water' ? 'kL' : 'm³'}
                        </div>
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
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No bills found matching your filters</p>
              <Button onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterMeterType('all');
                setSelectedMeter('all');
                searchParams.delete('meter');
                setSearchParams(searchParams);
              }}>
                Clear Filters
              </Button>
            </Card>
          )}
        </div>

        {/* Download button */}
        <div className="flex justify-center mt-8">
          <Button variant="outline" disabled={bills.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download Bills History
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Bills;