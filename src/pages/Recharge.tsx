
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Meter } from '@/types';
import { Zap, Droplet, Flame, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Recharge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMeter, setSelectedMeter] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's prepaid meters
  const { data: meters = [], isLoading } = useQuery<Meter[]>({
    queryKey: ['prepaid_meters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meters')
        .select('*, premises(*)')
        .eq('user_id', user?.id || '')
        .eq('billing_type', 'prepaid')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Handle recharge submission
  const handleRecharge = async () => {
    if (!user || !selectedMeter || !amount || parseFloat(amount) <= 0) {
      setError('Please select a meter and enter a valid amount');
      return;
    }
    
    setError(null);
    setIsProcessing(true);
    
    try {
      // Generate a unique transaction number
      const transactionNumber = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a new transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          user_id: user.id,
          meter_id: selectedMeter,
          transaction_type: 'recharge',
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          status: 'completed', // In a real app, this would be 'pending' until payment is confirmed
          transaction_date: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      // Show success state
      setIsSuccess(true);
      
      // Reset form
      setTimeout(() => {
        navigate(`/meters/${selectedMeter}`);
      }, 3000);
    } catch (err: any) {
      console.error('Error processing recharge:', err);
      setError(err.message || 'An error occurred while processing your recharge');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get icon by meter type
  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'electricity':
        return <Zap className="h-5 w-5" />;
      case 'water':
        return <Droplet className="h-5 w-5" />;
      case 'gas':
        return <Flame className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
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

  // Get selected meter details
  const selectedMeterDetails = meters.find(meter => meter.id === selectedMeter);

  return (
    <DashboardLayout title="Recharge Meter">
      <div className="max-w-3xl mx-auto">
        {isSuccess ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <CardTitle>Recharge Successful!</CardTitle>
              </div>
              <CardDescription>
                Your meter has been recharged successfully. You will be redirected to the meter details page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Meter</p>
                    <p className="font-medium">{selectedMeterDetails?.meter_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">₹{parseFloat(amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium capitalize">{paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/meters/${selectedMeter}`)}>
                Go to Meter Details
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recharge Your Prepaid Meter</CardTitle>
              <CardDescription>
                Select a meter and enter the amount you want to recharge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}
              
              {/* Meter selection */}
              <div className="space-y-2">
                <Label htmlFor="meter">Select Meter</Label>
                {isLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : meters.length > 0 ? (
                  <div className="grid gap-4">
                    {meters.map((meter) => (
                      <div
                        key={meter.id}
                        className={`border rounded-md p-4 cursor-pointer transition-colors ${
                          selectedMeter === meter.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedMeter(meter.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${getMeterColor(meter.meter_type)}`}>
                            {getMeterIcon(meter.meter_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{meter.meter_number}</h3>
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                                {meter.meter_type}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {meter.premises?.name || 'Unknown location'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">Balance</div>
                            <div className={`${meter.current_balance < (meter.threshold_limit || 100) ? 'text-red-500' : ''}`}>
                              ₹{meter.current_balance.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-md p-6 text-center">
                    <p className="text-muted-foreground mb-4">You don't have any active prepaid meters</p>
                    <Button variant="outline" onClick={() => navigate('/meters')}>
                      View All Meters
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Amount selection */}
              {selectedMeter && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Recharge Amount (₹)</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant={amount === '100' ? 'default' : 'outline'} 
                        onClick={() => setAmount('100')}
                      >
                        ₹100
                      </Button>
                      <Button 
                        variant={amount === '200' ? 'default' : 'outline'} 
                        onClick={() => setAmount('200')}
                      >
                        ₹200
                      </Button>
                      <Button 
                        variant={amount === '500' ? 'default' : 'outline'} 
                        onClick={() => setAmount('500')}
                      >
                        ₹500
                      </Button>
                      <Button 
                        variant={amount === '1000' ? 'default' : 'outline'} 
                        onClick={() => setAmount('1000')}
                      >
                        ₹1000
                      </Button>
                    </div>
                    <div className="flex gap-2 items-center mt-2">
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter custom amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Payment method */}
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Tabs defaultValue="card" onValueChange={setPaymentMethod}>
                      <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="card">Card</TabsTrigger>
                        <TabsTrigger value="upi">UPI</TabsTrigger>
                        <TabsTrigger value="netbanking">Netbanking</TabsTrigger>
                      </TabsList>
                      <TabsContent value="card" className="space-y-4 mt-4">
                        <div className="grid gap-2">
                          <Label htmlFor="card-number">Card Number</Label>
                          <Input id="card-number" placeholder="1234 5678 9012 3456" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input id="expiry" placeholder="MM/YY" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name on Card</Label>
                          <Input id="name" placeholder="John Doe" />
                        </div>
                      </TabsContent>
                      <TabsContent value="upi" className="space-y-4 mt-4">
                        <div className="grid gap-2">
                          <Label htmlFor="upi-id">UPI ID</Label>
                          <Input id="upi-id" placeholder="yourname@upi" />
                        </div>
                      </TabsContent>
                      <TabsContent value="netbanking" className="space-y-4 mt-4">
                        <div className="grid gap-2">
                          <Label htmlFor="bank">Select Bank</Label>
                          <Select>
                            <SelectTrigger id="bank">
                              <SelectValue placeholder="Select bank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sbi">State Bank of India</SelectItem>
                              <SelectItem value="hdfc">HDFC Bank</SelectItem>
                              <SelectItem value="icici">ICICI Bank</SelectItem>
                              <SelectItem value="axis">Axis Bank</SelectItem>
                              <SelectItem value="kotak">Kotak Mahindra Bank</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate('/meters')}>
                Cancel
              </Button>
              <Button 
                onClick={handleRecharge} 
                disabled={!selectedMeter || !amount || parseFloat(amount) <= 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" /> 
                    Pay ₹{amount ? parseFloat(amount).toFixed(2) : '0.00'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recharge;