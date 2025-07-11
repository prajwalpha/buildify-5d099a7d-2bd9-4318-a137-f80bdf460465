
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://diiqwihjpjjbhyccluqx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaXF3aWhqcGpqYmh5Y2NsdXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMTc3ODYsImV4cCI6MjA2Nzc5Mzc4Nn0.V42Q1V2lI89yRXCO-9pj0IvhgvlvVbciaEkwQR-_UUM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);