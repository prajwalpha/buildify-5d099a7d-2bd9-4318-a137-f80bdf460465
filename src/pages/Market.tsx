
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchCryptocurrencies } from '@/lib/supabase';
import { Cryptocurrency } from '@/types';
import { ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';

const Market = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Cryptocurrency; direction: 'asc' | 'desc' }>({
    key: 'market_cap',
    direction: 'desc',
  });

  // Fetch cryptocurrencies
  const { data: cryptocurrencies = [], isLoading } = useQuery<Cryptocurrency[]>({
    queryKey: ['cryptocurrencies'],
    queryFn: fetchCryptocurrencies,
  });

  // Filter cryptocurrencies based on search term
  const filteredCryptocurrencies = cryptocurrencies.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort cryptocurrencies
  const sortedCryptocurrencies = [...filteredCryptocurrencies].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Handle sort
  const handleSort = (key: keyof Cryptocurrency) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  return (
    <DashboardLayout title="Market">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Cryptocurrency Market</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cryptocurrency..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead className="min-w-[180px]">Name</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('current_price')}
                  >
                    Price
                    {sortConfig.key === 'current_price' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('price_change_24h')}
                  >
                    24h %
                    {sortConfig.key === 'price_change_24h' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('market_cap')}
                  >
                    Market Cap
                    {sortConfig.key === 'market_cap' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('volume_24h')}
                  >
                    Volume (24h)
                    {sortConfig.key === 'volume_24h' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedCryptocurrencies.length > 0 ? (
                  sortedCryptocurrencies.map((crypto, index) => (
                    <TableRow key={crypto.id}>
                      <TableCell>{index + 1}</TableCell>
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No cryptocurrencies found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Market;