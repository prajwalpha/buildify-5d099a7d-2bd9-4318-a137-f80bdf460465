
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { Bill, Transaction } from '@/types';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Share2, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Receipt,
  Building,
  User,
  Gauge
} from 'lucide-react';

const BillDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Fetch bill details
  const { data: bill, isLoading } = useQuery<Bill>({
    queryKey: ['bill', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, meter:meters(*, premises(*))')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch payment transactions for this bill
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['bill_transactions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('bill_id', id)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Handle payment submission
  const handlePayment = async () => {
    if (!user || !bill) return;
    
    try {
      // Generate a unique transaction number
      const transactionNumber = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a new transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          user_id: user.id,
          meter_id: bill.meter_id,
          bill_id: bill.id,
          transaction_type: 'payment',
          amount: bill.total_amount,
          payment_method: 'credit_card', // This would be selected by the user in a real app
          status: 'completed', // In a real app, this would be 'pending' until payment is confirmed
          transaction_date: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      // Update bill status
      await supabase
        .from('bills')
        .update({ status: 'completed' })
        .eq('id', bill.id);
      
      // Close the dialog
      setIsPaymentDialogOpen(false);
      
      // Refetch bill data to show updated status
      // In a real app, the status update would happen via a database trigger
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  // Get status badge variant
  const getStatusVariant = (status?: string) => {
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

  if (isLoading) {
    return (
      <DashboardLayout title="Bill Details">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!bill) {
    return (
      <DashboardLayout title="Bill Details">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Bill Not Found</h2>
          <p className="text-muted-foreground mb-6">The bill you're looking for doesn't exist or you don't have access to it.</p>
          <Button asChild>
            <Link to="/bills">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bills
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isPaid = bill.status === 'completed';
  const isOverdue = !isPaid && new Date(bill.due_date) < new Date();

  return (
    <DashboardLayout title="Bill Details">
      <div className="space-y-6">
        {/* Back button */}
        <div>
          <Button variant="outline" asChild>
            <Link to="/bills">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bills
            </Link>
          </Button>
        </div>

        {/* Bill header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{bill.bill_number}</h1>
              <Badge variant={getStatusVariant(bill.status)}>
                {bill.status}
              </Badge>
              {isOverdue && !isPaid && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {bill.meter?.meter_number || 'Unknown meter'} • 
              {bill.meter?.premises?.name 
                ? ` ${bill.meter.premises.name}` 
                : ' Unknown location'}
            </p>
          </div>
          <div className="flex gap-2">
            {!isPaid && (
              <Button onClick={() => setIsPaymentDialogOpen(true)}>
                <CreditCard className="mr-2 h-4 w-4" /> Pay Now
              </Button>
            )}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>

        {/* Bill details */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Billing information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Billing Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bill Number</p>
                    <p className="font-medium">{bill.bill_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2">
                      {isPaid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isOverdue ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <p className="font-medium">
                        {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing Period</p>
                    <p className="font-medium">
                      {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className={`font-medium ${isOverdue && !isPaid ? 'text-red-500' : ''}`}>
                        {new Date(bill.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{new Date(bill.created_at).toLocaleDateString()}</p>
                  </div>
                  {isPaid && transactions.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="font-medium">{new Date(transactions[0].transaction_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Meter information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Meter Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Meter Number</p>
                    <p className="font-medium">{bill.meter?.meter_number || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Meter Type</p>
                    <p className="font-medium capitalize">{bill.meter?.meter_type || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Previous Reading</p>
                    <p className="font-medium">
                      {bill.previous_reading} {getUnit(bill.meter?.meter_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Reading</p>
                    <p className="font-medium">
                      {bill.current_reading} {getUnit(bill.meter?.meter_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Consumption</p>
                    <p className="font-medium">
                      {bill.consumption} {getUnit(bill.meter?.meter_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rate</p>
                    <p className="font-medium">
                      ₹{bill.rate}/{getUnit(bill.meter?.meter_type)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Customer information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Customer Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-medium">{user?.email || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer ID</p>
                    <p className="font-medium">{user?.id.substring(0, 8) || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Premises information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Premises Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Premises Name</p>
                    <p className="font-medium">{bill.meter?.premises?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{bill.meter?.premises?.address || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{bill.meter?.premises?.city || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">State</p>
                    <p className="font-medium">{bill.meter?.premises?.state || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill summary */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consumption Charges</span>
                <span>₹{bill.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (GST)</span>
                <span>₹{bill.tax_amount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total Amount</span>
                <span>₹{bill.total_amount.toFixed(2)}</span>
              </div>

              {isPaid && transactions.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-green-600">
                      <span>Paid Amount</span>
                      <span>₹{transactions[0].amount.toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>Payment Method: {transactions[0].payment_method || 'Card'}</div>
                      <div>Transaction ID: {transactions[0].transaction_number}</div>
                      <div>Date: {new Date(transactions[0].transaction_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                </>
              )}

              {!isPaid && (
                <>
                  <Separator />
                  <Button className="w-full" onClick={() => setIsPaymentDialogOpen(true)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Pay Now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Bill</DialogTitle>
            <DialogDescription>
              Complete your payment for bill {bill.bill_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-between font-bold">
              <span>Total Amount</span>
              <span>₹{bill.total_amount.toFixed(2)}</span>
            </div>
            <Separator />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePayment}>
              Pay ₹{bill.total_amount.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default BillDetail;