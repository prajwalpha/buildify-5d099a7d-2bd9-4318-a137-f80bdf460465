
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  BarChart3, 
  Wallet, 
  Star, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useMobile();
  const [open, setOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Market', href: '/market', icon: BarChart3 },
    { name: 'Portfolio', href: '/portfolio', icon: Wallet },
    { name: 'Watchlist', href: '/watchlist', icon: Star },
    { name: 'Transactions', href: '/transactions', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
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
                      <h2 className="text-lg font-semibold">Galanfi</h2>
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
            <Avatar>
              <AvatarFallback>{user?.email ? getInitials(user.email) : 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r bg-background">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-16 px-6 border-b">
                <h2 className="text-xl font-bold">Galanfi</h2>
              </div>
              <div className="flex-1 px-3 py-4 space-y-1">
                <NavLinks />
              </div>
              <div className="p-3 border-t">
                <div className="flex items-center gap-3 p-2">
                  <Avatar>
                    <AvatarFallback>{user?.email ? getInitials(user.email) : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
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