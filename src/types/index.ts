
export interface Cryptocurrency {
  id: number;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  volume_24h: number;
  price_change_24h: number;
  last_updated: string;
  logo_url: string;
}

export interface PortfolioAsset {
  id: number;
  portfolio_id: number;
  crypto_id: number;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  cryptocurrencies?: Cryptocurrency;
}

export interface Portfolio {
  id: number;
  user_id: string;
  created_at: string;
  portfolio_assets?: PortfolioAsset[];
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  crypto_id: number;
  added_at: string;
  cryptocurrencies?: Cryptocurrency;
}

export interface Watchlist {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  watchlist_items?: WatchlistItem[];
}

export interface Transaction {
  id: number;
  user_id: string;
  crypto_id: number;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  transaction_date: string;
  notes?: string;
  cryptocurrencies?: Cryptocurrency;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}