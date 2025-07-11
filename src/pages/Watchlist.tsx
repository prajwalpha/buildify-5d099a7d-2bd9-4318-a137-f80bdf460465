
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpRight, ArrowDownRight, Plus, Star, Trash2 } from 'lucide-react';
import { fetchCryptocurrencies, fetchUserWatchlists, createWatchlist, addWatchlistItem } from '@/lib/supabase';
import { Cryptocurrency, Watchlist } from '@/types';
import { supabase } from '@/lib/supabase';

const WatchlistPage = () => {
  const { user } = useAuth();
  const [openAddCryptoDialog, setOpenAddCryptoDialog] = useState(false);
  const [openCreateWatchlistDialog, setOpenCreateWatchlistDialog] = useState(false);
  const [selectedCryptoId, setSelectedCryptoId] = useState<number | null>(null);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);

  // Fetch cryptocurrencies
  const { data: cryptocurrencies = [] } = useQuery<Cryptocurrency[]>({
    queryKey: ['cryptocurrencies'],
    queryFn: fetchCryptocurrencies,
  });

  // Fetch user watchlists
  const { data: watchlists = [], refetch: refetchWatchlists } = useQuery<Watchlist[]>({
    queryKey: ['watchlists', user?.id],
    queryFn: () => fetchUserWatchlists(user?.id || ''),
    enabled: !!user?.id,
    onSuccess: (data) => {
      if (data.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(data[0].id);
      }
    }
  });

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName || !user?.id) return;
    
    try {
      await createWatchlist(user.id, newWatchlistName);
      setNewWatchlistName('');
      setOpenCreateWatchlistDialog(false);
      refetchWatchlists();
    } catch (error) {
      console.error('Error creating watchlist:', error);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!selectedCryptoId || !selectedWatchlistId) return;
    
    try {
      await addWatchlistItem(selectedWatchlistId, selectedCryptoId);
      setSelectedCryptoId(null);
      setSelectedWatchlistId(null);
      setOpenAddCryptoDialog(false);
      refetchWatchlists();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const handleRemoveFromWatchlist = async (watchlistId: number, cryptoId: number) => {
    try {
      // Find the watchlist item
      const watchlist = watchlists.find(w => w.id === watchlistId);
      if (!watchlist) return;
      
      const watchlistItem = watchlist.watchlist_items?.find(item => item.crypto_id === cryptoId);
      if (!watchlistItem) return;
      
      // Delete the watchlist item
      await supabase
        .from('watchlist_items')
        .delete()
        .eq('id', watchlistItem.id);
      
      refetchWatchlists();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const getActiveWatchlist = () => {
    return watchlists.find(w => w.id === activeWatchlistId);
  };

  return (
    <DashboardLayout title="Watchlist">
      <div className="grid gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold">Your Watchlists</h2>
          <div className="flex gap-2">
            <Dialog open={openCreateWatchlistDialog} onOpenChange={setOpenCreateWatchlistDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  New Watchlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Watchlist</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new watchlist.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Watchlist Name</Label>
                    <Input
                      id="name"
                      placeholder="My Watchlist"
                      value={newWatchlistName}
                      onChange={(e) => setNewWatchlistName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCreateWatchlistDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWatchlist}>Create Watchlist</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={openAddCryptoDialog} onOpenChange={setOpenAddCryptoDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Crypto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Watchlist</DialogTitle>
                  <DialogDescription>
                    Select a cryptocurrency to add to your watchlist.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="watchlist">Watchlist</Label>
                    <Select onValueChange={(value) => setSelectedWatchlistId(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a watchlist" />
                      </SelectTrigger>
                      <SelectContent>
                        {watchlists.map((watchlist) => (
                          <SelectItem key={watchlist.id} value={watchlist.id.toString()}>
                            {watchlist.name}
                          </SelectItem>
                        ))}
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenAddCryptoDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddToWatchlist}>Add to Watchlist</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {watchlists.length > 0 ? (
          <Card>
            <CardHeader>
              <Tabs value={activeWatchlistId?.toString()} onValueChange={(value) => setActiveWatchlistId(parseInt(value))}>
                <TabsList className="mb-4">
                  {watchlists.map((watchlist) => (
                    <TabsTrigger key={watchlist.id} value={watchlist.id.toString()}>
                      <Star className="mr-2 h-4 w-4" />
                      {watchlist.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {watchlists.map((watchlist) => (
                  <TabsContent key={watchlist.id} value={watchlist.id.toString()}>
                    <CardTitle>{watchlist.name}</CardTitle>
                  </TabsContent>
                ))}
              </Tabs>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>24h %</TableHead>
                      <TableHead>Market Cap</TableHead>
                      <TableHead>Volume (24h)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getActiveWatchlist()?.watchlist_items?.length ? (
                      getActiveWatchlist()?.watchlist_items?.map((item) => {
                        const crypto = cryptocurrencies.find(c => c.id === item.crypto_id);
                        if (!crypto) return null;
                        
                        return (
                          <TableRow key={item.id}>
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
                            <TableCell>${crypto.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {crypto.price_change_24h > 0 ? (
                                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                                ) : (
                                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                                )}
                                <span className={crypto.price_change_24h > 0 ? 'text-green-500' : 'text-red-500'}>
                                  {crypto.price_change_24h > 0 ? '+' : ''}
                                  {crypto.price_change_24h.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>${crypto.market_cap.toLocaleString()}</TableCell>
                            <TableCell>${crypto.volume_24h.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveFromWatchlist(activeWatchlistId!, crypto.id)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No cryptocurrencies in this watchlist
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Watchlists Yet</h3>
              <p className="text-muted-foreground mb-6">Create your first watchlist to track cryptocurrencies</p>
              <Button onClick={() => setOpenCreateWatchlistDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Watchlist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WatchlistPage;