
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import { fetchCryptocurrencies, fetchUserPortfolios, createPortfolio, addPortfolioAsset, addTransaction } from '@/lib/supabase';
import { Cryptocurrency, Portfolio, PortfolioAsset } from '@/types';
import { supabase } from '@/lib/supabase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

const PortfolioPage = () => {
  const { user } = useAuth();
  const [openAddAssetDialog, setOpenAddAssetDialog] = useState(false);
  const [selectedCryptoId, setSelectedCryptoId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [portfolioChange, setPortfolioChange] = useState(0);
  const [portfolioAssets, setPortfolioAssets] = useState<(PortfolioAsset & { value: number, change: number })[]>([]);
  const [pieChartData, setPieChartData] = useState<{ name: string; value: number; color: string }[]>([]);

  // Fetch cryptocurrencies
  const { data: cryptocurrencies = [] } = useQuery<Cryptocurrency[]>({
    queryKey: ['cryptocurrencies'],
    queryFn: fetchCryptocurrencies,
  });

  // Fetch user portfolio
  const { data: portfolios = [], refetch: refetchPortfolios } = useQuery<Portfolio[]>({
    queryKey: ['portfolios', user?.id],
    queryFn: () => fetchUserPortfolios(user?.id || ''),
    enabled: !!user?.id,
  });

  // Calculate portfolio value and change
  useEffect(() => {
    if (portfolios.length > 0 && cryptocurrencies.length > 0) {
      let totalValue = 0;
      let totalChange = 0;
      const assetsWithValues: (PortfolioAsset & { value: number, change: number })[] = [];
      const chartData: { name: string; value: number; color: string }[] = [];

      const portfolio = portfolios[0];
      if (portfolio.portfolio_assets) {
        portfolio.portfolio_assets.forEach((asset, index) => {
          const crypto = cryptocurrencies.find(c => c.id === asset.crypto_id);
          if (crypto) {
            const assetValue = asset.quantity * crypto.current_price;
            totalValue += assetValue;
            
            // Calculate 24h change
            const previousValue = asset.quantity * (crypto.current_price / (1 + crypto.price_change_24h / 100));
            const assetChange = assetValue - previousValue;
            totalChange += assetChange;
            
            assetsWithValues.push({
              ...asset,
              value: assetValue,
              change: assetChange
            });
            
            chartData.push({
              name: crypto.symbol,
              value: assetValue,
              color: COLORS[index % COLORS.length]
            });
          }
        });
      }

      setPortfolioValue(totalValue);
      setPortfolioChange(totalChange);
      setPortfolioAssets(assetsWithValues);
      setPieChartData(chartData);
    }
  }, [portfolios, cryptocurrencies]);

  const handleAddAsset = async () => {
    if (!selectedCryptoId || !quantity || !purchasePrice || !user?.id) return;
    
    try {
      // Check if user has a portfolio
      let portfolioId: number;
      if (portfolios.length === 0) {
        // Create a new portfolio
        const newPortfolio = await createPortfolio(user.id);
        portfolioId = newPortfolio.id;
      } else {
        portfolioId = portfolios[0].id;
      }
      
      // Add asset to portfolio
      await addPortfolioAsset(
        portfolioId,
        selectedCryptoId,
        parseFloat(quantity),
        parseFloat(purchasePrice)
      );
      
      // Add transaction record
      await addTransaction(
        user.id,
        selectedCryptoId,
        'buy',
        parseFloat(quantity),
        parseFloat(purchasePrice)
      );
      
      // Reset form and close dialog
      setSelectedCryptoId(null);
      setQuantity('');
      setPurchasePrice('');
      setOpenAddAssetDialog(false);
      
      // Refetch portfolio data
      refetchPortfolios();
    } catch (error) {
      console.error('Error adding asset:', error);
    }
  };

  return (
    <DashboardLayout title="Portfolio">
      <div className="grid gap-6">
        {/* Portfolio summary */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
              <CardDescription>Your cryptocurrency holdings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Total Value</h3>
                  <p className="text-3xl font-bold">${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">24h Change</h3>
                  <div className="flex items-center">
                    {portfolioChange >= 0 ? (
                      <ArrowUpRight className="mr-1 text-green-500" />
                    ) : (
                      <ArrowDownRight className="mr-1 text-red-500" />
                    )}
                    <span className={portfolioChange >= 0 ? 'text-green-500 text-xl font-bold' : 'text-red-500 text-xl font-bold'}>
                      {portfolioChange >= 0 ? '+' : ''}
                      ${Math.abs(portfolioChange).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {' '}
                      ({portfolioValue > 0 ? ((portfolioChange / portfolioValue) * 100).toFixed(2) : '0.00'}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Dialog open={openAddAssetDialog} onOpenChange={setOpenAddAssetDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Asset to Portfolio</DialogTitle>
                    <DialogDescription>
                      Enter the details of the cryptocurrency you want to add to your portfolio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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
                      <Label htmlFor="price">Purchase Price (USD)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenAddAssetDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAsset}>Add Asset</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
              <CardDescription>Distribution of your assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No assets in portfolio</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio assets */}
        <Card>
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Average Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Profit/Loss</TableHead>
                    <TableHead>24h Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioAssets.length > 0 ? (
                    portfolioAssets.map((asset) => {
                      const crypto = cryptocurrencies.find(c => c.id === asset.crypto_id);
                      if (!crypto) return null;
                      
                      const profitLoss = asset.value - (asset.purchase_price * asset.quantity);
                      const profitLossPercentage = ((crypto.current_price - asset.purchase_price) / asset.purchase_price) * 100;
                      
                      return (
                        <TableRow key={asset.id}>
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
                          <TableCell>{asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}</TableCell>
                          <TableCell>${asset.purchase_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>${crypto.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>${asset.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <div className={profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              <div className="text-xs">
                                ({profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {asset.change >= 0 ? (
                                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                              ) : (
                                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                              )}
                              <span className={asset.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {asset.change >= 0 ? '+' : ''}
                                ${Math.abs(asset.change).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No assets in portfolio
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

export default PortfolioPage;