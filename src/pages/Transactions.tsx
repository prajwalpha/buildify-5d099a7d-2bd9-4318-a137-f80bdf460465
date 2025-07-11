
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpRight, ArrowDownRight, Plus, Filter } from 'lucide-react';
import { fetchCryptocurrencies, fetchUserTransactions, addTransaction } from '@/lib/supabase';
import { Cryptocurrency, Transaction } from '@/types';
import { supabase } from '@/lib/supabase';

const TransactionsPage = () => {
  const { user } = useAuth();
  const [openAddTransactionDialog, setOpenAddTransactionDialog] = useState(false);
  const [selectedCryptoId, setSelectedCryptoId] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');

  // Fetch cryptocurrencies
  const { data: cryptocurrencies = [] } = useQuery<Cryptocurrency[]>({
    queryKey: ['cryptocurrencies'],
    queryFn: fetchCryptocurrencies,
  });

  // Fetch user transactions
  const { data: transactions = [], refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ['transactions', user?.id],
    queryFn: () => fetchUserTransactions(user?.id || ''),
    enabled: !!user?.id,
  });

  // Filter transactions
  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.transaction_type === filterType);

  const handleAddTransaction = async () => {
    if (!selectedCryptoId || !quantity || !price || !user?.id) return;
    
    try {
      await addTransaction(
        user.id,
        selectedCryptoId,
        transactionType,
        parseFloat(quantity),
        parseFloat(price),
        notes
      );
      
      // Reset form and close dialog
      setSelectedCryptoId(null);
      setTransactionType('buy');
      setQuantity('');
      setPrice('');
      setNotes('');
      setOpenAddTransactionDialog(false);
      
      // Refetch transactions
      refetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <DashboardLayout title="Transactions">
      <div className="grid gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">Transaction History</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'buy' | 'sell')}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={openAddTransactionDialog} onOpenChange={setOpenAddTransactionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                  <DialogDescription>
                    Record a new cryptocurrency transaction.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <Select value={transactionType} onValueChange={(value) => setTransactionType(value as 'buy' | 'sell')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crypto">Cryptocurrency</Label>
                    <Select onValueChange={(value) => setSelectedCryptoId(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cryptocurrency" />
                      </SelectTrigger>
                      <SelectContent>
                        {cryptocurrencies.map((crypto) => (
                          <SelectItem key={crypto.id} value={crypto.id.toString()}>
                            {crypto.name} ({crypto.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price per Coin (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional information"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenAddTransactionDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTransaction}>Add Transaction</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction) => {
                      const crypto = cryptocurrencies.find(c => c.id === transaction.crypto_id);
                      if (!crypto) return null;
                      
                      const total = transaction.quantity * transaction.price;
                      
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {transaction.transaction_type === 'buy' ? (
                                <div className="flex items-center gap-1 text-green-500">
                                  <ArrowUpRight className="h-4 w-4" />
                                  <span>Buy</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-500">
                                  <ArrowDownRight className="h-4 w-4" />
                                  <span>Sell</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {crypto.logo_url && (
                                <img src={crypto.logo_url} alt={crypto.name} className="w-6 h-6" />
                              )}
                              <div>
                                <div className="font-medium">{crypto.name}</div>
                                <div className="text-xs text-muted-foreground">{crypto.symbol}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{transaction.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}</TableCell>
                          <TableCell>${transaction.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            {transaction.notes ? (
                              <div className="max-w-[200px] truncate" title={transaction.notes}>
                                {transaction.notes}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TransactionsPage;