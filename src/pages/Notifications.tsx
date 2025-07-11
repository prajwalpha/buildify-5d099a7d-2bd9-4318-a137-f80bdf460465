
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Notification, NotificationType } from '@/types';
import { Bell, AlertTriangle, Info, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const Notifications = () => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, meter:meters(meter_number, meter_type)')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mark all as read when page loads
  useEffect(() => {
    const markAllAsRead = async () => {
      if (!user) return;
      
      const unreadNotifications = notifications.filter(n => !n.is_read);
      if (unreadNotifications.length === 0) return;
      
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      refetch();
    };
    
    markAllAsRead();
  }, [user, notifications, refetch]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    // Type filter
    const typeMatch = filterType === 'all' || notification.notification_type === filterType;
    
    // Read status filter
    const readMatch = filterRead === 'all' || 
      (filterRead === 'read' && notification.is_read) || 
      (filterRead === 'unread' && !notification.is_read);
    
    return typeMatch && readMatch;
  });

  // Delete notification
  const deleteNotification = async (id: string) => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    refetch();
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (!user) return;
    
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    
    refetch();
  };

  // Get notification icon and color
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'alert':
        return { icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500 bg-red-100' };
      case 'reminder':
        return { icon: <Clock className="h-5 w-5" />, color: 'text-yellow-500 bg-yellow-100' };
      case 'info':
      default:
        return { icon: <Info className="h-5 w-5" />, color: 'text-blue-500 bg-blue-100' };
    }
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Notifications</h1>
            <Badge variant="outline">{notifications.length}</Badge>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="alert">Alerts</SelectItem>
                <SelectItem value="reminder">Reminders</SelectItem>
                <SelectItem value="info">Information</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterRead} onValueChange={(value) => setFilterRead(value as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              className="ml-auto"
              onClick={deleteAllNotifications}
              disabled={notifications.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => {
              const { icon, color } = getNotificationStyle(notification.notification_type);
              const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
              
              return (
                <Card key={notification.id} className={notification.is_read ? '' : 'border-primary bg-primary/5'}>
                  <div className="flex gap-4 p-4">
                    <div className={`p-2 rounded-full h-fit ${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-1">{notification.message}</p>
                      {notification.meter && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Meter: </span>
                          <span>{notification.meter.meter_number} ({notification.meter.meter_type})</span>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), 'PPp')}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className="p-3 rounded-full bg-gray-100">
                  <Bell className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="font-medium">No notifications</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                {filterType !== 'all' || filterRead !== 'all' 
                  ? 'No notifications match your current filters' 
                  : 'You don\'t have any notifications yet'}
              </p>
              {(filterType !== 'all' || filterRead !== 'all') && (
                <Button onClick={() => {
                  setFilterType('all');
                  setFilterRead('all');
                }}>
                  Clear Filters
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;