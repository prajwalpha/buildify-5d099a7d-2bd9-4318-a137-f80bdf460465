
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://diiqwihjpjjbhyccluqx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaXF3aWhqcGpqYmh5Y2NsdXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMTc3ODYsImV4cCI6MjA2Nzc5Mzc4Nn0.V42Q1V2lI89yRXCO-9pj0IvhgvlvVbciaEkwQR-_UUM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchCryptocurrencies = async () => {
  const { data, error } = await supabase
    .from('cryptocurrencies')
    .select('*')
    .order('market_cap', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const fetchUserPortfolios = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_portfolios')
    .select(`
      id,
      created_at,
      portfolio_assets (
        id,
        quantity,
        purchase_price,
        purchase_date,
        cryptocurrencies (*)
      )
    `)
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
};

export const fetchUserWatchlists = async (userId: string) => {
  const { data, error } = await supabase
    .from('watchlists')
    .select(`
      id,
      name,
      created_at,
      watchlist_items (
        id,
        added_at,
        cryptocurrencies (*)
      )
    `)
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
};

export const fetchUserTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      transaction_type,
      quantity,
      price,
      transaction_date,
      notes,
      cryptocurrencies (*)
    `)
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const createPortfolio = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_portfolios')
    .insert([{ user_id: userId }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const addPortfolioAsset = async (portfolioId: number, cryptoId: number, quantity: number, purchasePrice: number) => {
  const { data, error } = await supabase
    .from('portfolio_assets')
    .insert([{
      portfolio_id: portfolioId,
      crypto_id: cryptoId,
      quantity,
      purchase_price: purchasePrice
    }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const createWatchlist = async (userId: string, name: string) => {
  const { data, error } = await supabase
    .from('watchlists')
    .insert([{ user_id: userId, name }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const addWatchlistItem = async (watchlistId: number, cryptoId: number) => {
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert([{ watchlist_id: watchlistId, crypto_id: cryptoId }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const addTransaction = async (userId: string, cryptoId: number, type: 'buy' | 'sell', quantity: number, price: number, notes?: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      crypto_id: cryptoId,
      transaction_type: type,
      quantity,
      price,
      notes
    }])
    .select();
  
  if (error) throw error;
  return data[0];
};