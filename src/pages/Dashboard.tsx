
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchCryptocurrencies, fetchUserPortfolios, fetchUserTransactions } from '@/lib/supabase';
import { Cryptocurrency, Portfolio, Transaction } from '@/types';
import { ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, BarChart3, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [portfolioChange, setPortfolioChange] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  // Fetch cryptocurrencies
  const { data: cryptocurrencies = [] } = useQuery<Cryptocurrency[]>({
    queryKey: ['cryptocurrencies'],
    queryFn: fetchCryptocurrencies,
  });

  // Fetch user portfolio
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ['portfolios', user?.id],
    queryFn: () => fetchUserPortfolios(user?.id || ''),
    enabled: !!user?.id,
  });

  // Fetch user transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions', user?.id],
    queryFn: () => fetchUserTransactions(user?.id || ''),
    enabled: !!user?.id,
  });

  // Calculate portfolio value and change
  useEffect(() => {
    if (portfolios.length > 0 && cryptocurrencies.length > 0) {
      let totalValue = 0;
      let totalChange = 0;

      const portfolio = portfolios[0];
      if (portfolio.portfolio_assets) {
        portfolio.portfolio_assets.forEach(asset => {
          const crypto = cryptocurrencies.find(c => c.id === asset.crypto_id);
          if (crypto) {
            const assetValue = asset.quantity * crypto.current_price;
            totalValue += assetValue;
            
            // Calculate 24h change
            const previousValue = asset.quantity * (crypto.current_price / (1 + crypto.price_change_24h / 100));
            totalChange += assetValue - previousValue;
          }
        });
      }

      setPortfolioValue(totalValue);
      setPortfolioChange(totalChange);
    }
  }, [portfolios, cryptocurrencies]);

  // Get recent transactions
  useEffect(() => {
    if (transactions.length > 0) {
      setRecentTransactions(transactions.slice(0, 5));
    }
  }, [transactions]);

  // Mock data for charts
  const portfolioChartData = [
    { name: '1D', value: 67500 },
    { name: '1W', value: 65200 },
    { name: '1M', value: 62800 },
    { name: '3M', value: 58900 },
    { name: '6M', value: 52400 },
    { name: 'YTD', value: 48700 },
    { name: '1Y', value: 42300 },
    { name: 'ALL', value: portfolioValue },
  ];

  const marketChartData = [
    { name: 'Jan', btc: 42000, eth: 3200 },
    { name: 'Feb', btc: 45000, eth: 3000 },
    { name: 'Mar', btc: 47000, eth: 3100 },
    { name: 'Apr', btc: 51000, eth: 3300 },
    { name: 'May', btc: 58000, eth: 3500 },
    { name: 'Jun', btc: 62000, eth: 3400 },
    { name: 'Jul', btc: 65000, eth: 3600 },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6">
        {/* Portfolio summary */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Portfolio Value</CardDescription>
              <CardTitle className="text-3xl">${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                {portfolioChange >= 0 ? (
                  <ArrowUpRight className="mr-1 text-green-500" />
                ) : (
                  <ArrowDownRight className="mr-1 text-red-500" />
                )}
                <span className={portfolioChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {portfolioChange >= 0 ? '+' : ''}
                  ${Math.abs(portfolioChange).toLocaleString(undefined, { maximumFractionDigits: 2 })} (24h)
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assets</CardDescription>
              <CardTitle className="text-3xl">
                {portfolios[0]?.portfolio_assets?.length || 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <DollarSign className="mr-1 h-4 w-4" />
                <span>Different cryptocurrencies</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Market Trend</CardDescription>
              <CardTitle className="text-3xl">
                {cryptocurrencies.filter(c => c.price_change_24h > 0).length > cryptocurrencies.filter(c => c.price_change_24h < 0).length ? 'Bullish' : 'Bearish'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <TrendingUp className="mr-1 h-4 w-4" />
                <span>Based on top 100 coins</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Transactions</CardDescription>
              <CardTitle className="text-3xl">{transactions.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground">
                <Activity className="mr-1 h-4 w-4" />
                <span>Total transactions</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Value']} />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="btc">
                <TabsList className="mb-4">
                  <TabsTrigger value="btc">Bitcoin</TabsTrigger>
                  <TabsTrigger value="eth">Ethereum</TabsTrigger>
                </TabsList>
                <TabsContent value="btc">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marketChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, 'Price']} />
                        <Line type="monotone" dataKey="btc" stroke="#f7931a" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                <TabsContent value="eth">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marketChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value}`, 'Price']} />
                        <Line type="monotone" dataKey="eth" stroke="#627eea" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${transaction.transaction_type === 'buy' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {transaction.transaction_type === 'buy' ? (
                          <ArrowUpRight className={`h-4 w-4 ${transaction.transaction_type === 'buy' ? 'text-green-500' : 'text-red-500'}`} />
                        ) : (
                          <ArrowDownRight className={`h-4 w-4 ${transaction.transaction_type === 'buy' ? 'text-green-500' : 'text-red-500'}`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.cryptocurrencies?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {transaction.transaction_type === 'buy' ? '+' : '-'} {transaction.quantity} {transaction.cryptocurrencies?.symbol}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${(transaction.price * transaction.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No recent transactions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;