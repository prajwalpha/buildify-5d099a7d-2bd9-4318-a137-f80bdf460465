
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Gauge, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  CreditCard,
  Users,
  Building2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  adminLayout?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, adminLayout = false }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useMobile();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // User navigation
  const userNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Meters', href: '/meters', icon: Gauge },
    { name: 'Bills', href: '/bills', icon: Receipt },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Recharge', href: '/recharge', icon: CreditCard },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Admin navigation
  const adminNavigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Clients', href: '/admin/clients', icon: Building2 },
    { name: 'Meters', href: '/admin/meters', icon: Gauge },
    { name: 'Billing', href: '/admin/billing', icon: Receipt },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const navigation = adminLayout ? adminNavigation : userNavigation;

  // Fetch notifications
  React.useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev.slice(0, 4)]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            onClick={() => setOpen(false)}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
      {!adminLayout && (
        <Link
          to="/notifications"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            location.pathname === '/notifications'
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          onClick={() => setOpen(false)}
        >
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-auto">{unreadCount}</Badge>
          )}
        </Link>
      )}
      <Button 
        variant="ghost" 
        className="flex items-center gap-3 px-3 py-2 justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
        onClick={handleSignOut}
      >
        <LogOut className="w-5 h-5" />
        <span>Sign Out</span>
      </Button>
    </>
  );

  const appName = adminLayout ? "IoT Utility Admin" : "IoT Utility Manager";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-2">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between h-16 px-4 border-b">
                      <h2 className="text-lg font-semibold">{appName}</h2>
                      <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="flex-1 px-2 py-4 space-y-1">
                      <NavLinks />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {!adminLayout && (
                <Link to="/notifications" className="relative">
                  <Button variant="ghost" size="icon">
                    <Bell className="w-5 h-5" />
                  </Button>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              )}
              <Avatar>
                <AvatarFallback>{profile?.full_name ? getInitials(profile.full_name) : getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r bg-background">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-16 px-6 border-b">
                <h2 className="text-xl font-bold">{appName}</h2>
              </div>
              <div className="flex-1 px-3 py-4 space-y-1">
                <NavLinks />
              </div>
              <div className="p-3 border-t">
                <div className="flex items-center gap-3 p-2">
                  <Avatar>
                    <AvatarFallback>{profile?.full_name ? getInitials(profile.full_name) : getInitials(user?.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{profile?.full_name || user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.role || 'User'}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className={`flex-1 ${!isMobile ? 'ml-64' : ''}`}>
          {!isMobile && (
            <header className="sticky top-0 z-30 h-16 border-b bg-background">
              <div className="flex items-center justify-between h-full px-6">
                <h1 className="text-xl font-semibold">{title}</h1>
                <div className="flex items-center gap-4">
                  {!adminLayout && (
                    <div className="relative">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/notifications">
                          <Bell className="w-5 h-5" />
                        </Link>
                      </Button>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{profile?.full_name ? getInitials(profile.full_name) : getInitials(user?.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground">{profile?.role || 'User'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

export default DashboardLayout;