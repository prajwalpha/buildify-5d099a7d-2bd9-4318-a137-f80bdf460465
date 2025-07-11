
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { supabase } from '@/lib/supabase';
import { Meter, MeterType, Report, ReportParameters } from '@/types';
import { 
  FileText, 
  BarChart3, 
  Download, 
  Mail, 
  FileSpreadsheet, 
  FilePdf,
  Zap,
  Droplet,
  Flame,
  CreditCard,
  Receipt
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('consumption');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedMeters, setSelectedMeters] = useState<string[]>([]);
  const [selectedMeterTypes, setSelectedMeterTypes] = useState<MeterType[]>([]);
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [sendEmail, setSendEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's meters
  const { data: meters = [] } = useQuery<Meter[]>({
    queryKey: ['meters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meters')
        .select('*, premises(*)')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's reports
  const { data: reports = [], isLoading, refetch } = useQuery<Report[]>({
    queryKey: ['reports', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Group meters by type
  const electricityMeters = meters.filter(meter => meter.meter_type === 'electricity');
  const waterMeters = meters.filter(meter => meter.meter_type === 'water');
  const gasMeters = meters.filter(meter => meter.meter_type === 'gas');

  // Toggle meter selection
  const toggleMeter = (meterId: string) => {
    setSelectedMeters(prev => 
      prev.includes(meterId) 
        ? prev.filter(id => id !== meterId) 
        : [...prev, meterId]
    );
  };

  // Toggle meter type selection
  const toggleMeterType = (type: MeterType) => {
    setSelectedMeterTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  // Select all meters of a type
  const selectAllOfType = (type: MeterType) => {
    const metersOfType = meters.filter(meter => meter.meter_type === type);
    const meterIds = metersOfType.map(meter => meter.id);
    
    setSelectedMeters(prev => {
      const remaining = prev.filter(id => !meterIds.includes(id));
      return [...remaining, ...meterIds];
    });
  };

  // Deselect all meters of a type
  const deselectAllOfType = (type: MeterType) => {
    const metersOfType = meters.filter(meter => meter.meter_type === type);
    const meterIds = metersOfType.map(meter => meter.id);
    
    setSelectedMeters(prev => prev.filter(id => !meterIds.includes(id)));
  };

  // Generate report
  const generateReport = async () => {
    if (!user) return;
    
    if (!dateRange?.from || !dateRange?.to) {
      alert('Please select a date range');
      return;
    }
    
    if (selectedMeters.length === 0 && selectedMeterTypes.length === 0) {
      alert('Please select at least one meter or meter type');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // In a real app, this would call an API endpoint to generate the report
      // For now, we'll just create a record in the reports table
      
      const reportParameters: ReportParameters = {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        meterIds: selectedMeters.length > 0 ? selectedMeters : undefined,
        meterTypes: selectedMeterTypes.length > 0 ? selectedMeterTypes : undefined,
        reportType: activeTab as any,
        format: reportFormat,
        sendEmail: sendEmail,
        email: sendEmail ? email : undefined
      };
      
      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          report_type: `${activeTab}_report`,
          parameters: reportParameters,
          file_path: `/reports/${Date.now()}_${activeTab}_report.${reportFormat}`
        })
        .select();
      
      if (error) throw error;
      
      // Refetch reports
      refetch();
      
      // Reset form
      setDateRange(undefined);
      setSelectedMeters([]);
      setSelectedMeterTypes([]);
      setReportFormat('pdf');
      setSendEmail(false);
      setEmail('');
      
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Report generator */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>
              Create custom reports for your utility consumption, billing, and transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="consumption">
                  <BarChart3 className="mr-2 h-4 w-4" /> Consumption
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <Receipt className="mr-2 h-4 w-4" /> Billing
                </TabsTrigger>
                <TabsTrigger value="transaction">
                  <CreditCard className="mr-2 h-4 w-4" /> Transactions
                </TabsTrigger>
              </TabsList>
              
              