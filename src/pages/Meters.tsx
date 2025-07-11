
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Meter, MeterType, BillingType } from '@/types';
import { Link } from 'react-router-dom';
import { Zap, Droplet, Flame, Plus, Search, AlertTriangle } from 'lucide-react';

const Meters = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'balance'>('newest');
  const [filterType, setFilterType] = useState<MeterType | 'all'>('all');
  const [filterBilling, setFilterBilling] = useState<BillingType | 'all'>('all');

  // Fetch user's meters
  const { data: meters = [], isLoading, refetch } = useQuery<Meter[]>({
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

  // Filter and sort meters
  const filteredMeters = meters.filter(meter => {
    // Search filter
    const searchMatch = 
      meter.meter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meter.premises?.name && meter.premises.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (meter.premises?.address && meter.premises.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Type filter
    const typeMatch = filterType === 'all' || meter.meter_type === filterType;
    
    // Billing filter
    const billingMatch = filterBilling === 'all' || meter.billing_type === filterBilling;
    
    return searchMatch && typeMatch && billingMatch;
  });

  // Sort meters
  const sortedMeters = [...filteredMeters].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'balance') {
      return b.current_balance - a.current_balance;
    }
    return 0;
  });

  // Group meters by type
  const electricityMeters = meters.filter(meter => meter.meter_type === 'electricity');
  const waterMeters = meters.filter(meter => meter.meter_type === 'water');
  const gasMeters = meters.filter(meter => meter.meter_type === 'gas');

  // Get icon by meter type
  const getMeterIcon = (type: MeterType) => {
    switch (type) {
      case 'electricity':
        return <Zap className="h-5 w-5" />;
      case 'water':
        return <Droplet className="h-5 w-5" />;
      case 'gas':
        return <Flame className="h-5 w-5" />;
    }
  };

  // Get color by meter type
  const getMeterColor = (type: MeterType) => {
    switch (type) {
      case 'electricity':
        return 'text-orange-500 bg-orange-100';
      case 'water':
        return 'text-blue-500 bg-blue-100';
      case 'gas':
        return 'text-purple-500 bg-purple-100';
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
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

  return (
    <DashboardLayout title="My Meters">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-orange-100">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle>Electricity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{electricityMeters.length}</div>
              <p className="text-sm text-muted-foreground">
                {electricityMeters.filter(m => m.billing_type === 'prepaid').length} prepaid, 
                {electricityMeters.filter(m => m.billing_type === 'postpaid').length} postpaid
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-100">
                  <Droplet className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle>Water</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{waterMeters.length}</div>
              <p className="text-sm text-muted-foreground">
                {waterMeters.filter(m => m.billing_type === 'prepaid').length} prepaid, 
                {waterMeters.filter(m => m.billing_type === 'postpaid').length} postpaid
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-purple-100">
                  <Flame className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle>Gas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{gasMeters.length}</div>
              <p className="text-sm text-muted-foreground">
                {gasMeters.filter(m => m.billing_type === 'prepaid').length} prepaid, 
                {gasMeters.filter(m => m.billing_type === 'postpaid').length} postpaid
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meters..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="gas">Gas</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterBilling} onValueChange={(value) => setFilterBilling(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Billing type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Billing</SelectItem>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="postpaid">Postpaid</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Meters list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sortedMeters.length > 0 ? (
            sortedMeters.map((meter) => (
              <Card key={meter.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className={`p-6 flex items-center justify-center ${getMeterColor(meter.meter_type)} md:w-24`}>
                    {getMeterIcon(meter.meter_type)}
                  </div>
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{meter.meter_number}</h3>
                          <Badge variant={getStatusVariant(meter.status)}>
                            {meter.status}
                          </Badge>
                          <Badge variant="outline">{meter.billing_type}</Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {meter.premises?.name || 'Unknown location'} • {meter.premises?.address || 'No address'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        {meter.billing_type === 'prepaid' && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Balance:</span>
                            <span className={`font-bold ${meter.current_balance < (meter.threshold_limit || 100) ? 'text-red-500' : ''}`}>
                              ₹{meter.current_balance.toFixed(2)}
                            </span>
                            {meter.current_balance < (meter.threshold_limit || 100) && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Last reading: {meter.last_reading} {meter.meter_type === 'electricity' ? 'kWh' : meter.meter_type === 'water' ? 'kL' : 'm³'}
                          {meter.last_reading_date && ` (${new Date(meter.last_reading_date).toLocaleDateString()})`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex justify-end items-end border-t md:border-t-0 md:border-l">
                    <Button asChild>
                      <Link to={`/meters/${meter.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No meters found matching your filters</p>
              <Button onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterBilling('all');
              }}>
                Clear Filters
              </Button>
            </Card>
          )}
        </div>

        {/* Request new meter button */}
        <div className="flex justify-center mt-8">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" /> Request New Meter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request New Meter</DialogTitle>
                <DialogDescription>
                  Fill out this form to request a new meter installation. Our team will contact you to complete the process.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="meter-type">Meter Type</Label>
                  <Select defaultValue="electricity">
                    <SelectTrigger id="meter-type">
                      <SelectValue placeholder="Select meter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electricity">Electricity</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing-type">Billing Type</Label>
                  <Select defaultValue="prepaid">
                    <SelectTrigger id="billing-type">
                      <SelectValue placeholder="Select billing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prepaid">Prepaid</SelectItem>
                      <SelectItem value="postpaid">Postpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Installation Address</Label>
                  <Input id="address" placeholder="Enter full address" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Input id="notes" placeholder="Any specific requirements" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Meters;