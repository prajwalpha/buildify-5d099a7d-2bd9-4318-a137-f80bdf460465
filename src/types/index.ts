
export type MeterType = 'electricity' | 'water' | 'gas';
export type MeterStatus = 'active' | 'inactive' | 'maintenance';
export type BillingType = 'prepaid' | 'postpaid';
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type TransactionType = 'recharge' | 'payment' | 'refund';
export type NotificationType = 'alert' | 'reminder' | 'info';
export type UserRole = 'admin' | 'user' | 'technician';

export interface User {
  id: string;
  email?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_id?: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Premises {
  id: string;
  client_id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Meter {
  id: string;
  meter_number: string;
  premises_id: string;
  user_id?: string;
  meter_type: MeterType;
  billing_type: BillingType;
  status: MeterStatus;
  installation_date?: string;
  last_reading: number;
  last_reading_date?: string;
  current_balance: number;
  tariff_rate: number;
  threshold_limit?: number;
  created_at: string;
  updated_at: string;
  premises?: Premises;
  user?: Profile;
}

export interface MeterReading {
  id: string;
  meter_id: string;
  reading: number;
  reading_date: string;
  consumption?: number;
  is_manual: boolean;
  notes?: string;
  created_at: string;
  meter?: Meter;
}

export interface Bill {
  id: string;
  meter_id: string;
  bill_number: string;
  billing_period_start: string;
  billing_period_end: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  rate: number;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  meter?: Meter;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  user_id: string;
  meter_id?: string;
  bill_id?: string;
  transaction_type: TransactionType;
  amount: number;
  payment_method?: string;
  payment_reference?: string;
  status: PaymentStatus;
  transaction_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  meter?: Meter;
  bill?: Bill;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  meter_id?: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
  meter?: Meter;
}

export interface AlertConfiguration {
  id: string;
  user_id: string;
  meter_id: string;
  low_balance_threshold?: number;
  high_consumption_threshold?: number;
  bill_reminder_days?: number;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
  updated_at: string;
  meter?: Meter;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: string;
  parameters?: any;
  file_path?: string;
  created_at: string;
  user?: Profile;
}

export interface ConsumptionData {
  date: string;
  value: number;
  meter_type: MeterType;
}

export interface DashboardStats {
  totalMeters: number;
  activeMeters: number;
  totalBills: number;
  pendingBills: number;
  totalTransactions: number;
  recentTransactions: Transaction[];
  recentReadings: MeterReading[];
  consumptionTrend: ConsumptionData[];
}

export interface ReportParameters {
  startDate: string;
  endDate: string;
  meterIds?: string[];
  meterTypes?: MeterType[];
  reportType: 'consumption' | 'billing' | 'transaction';
  format: 'pdf' | 'excel';
  sendEmail?: boolean;
  email?: string;
}