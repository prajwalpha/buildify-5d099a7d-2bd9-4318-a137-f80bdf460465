
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Bell, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Settings = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [state, setState] = useState(profile?.state || '');
  const [postalCode, setPostalCode] = useState(profile?.postal_code || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(true);
  const [highConsumptionAlerts, setHighConsumptionAlerts] = useState(true);
  const [billReminderAlerts, setBillReminderAlerts] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationSuccess, setNotificationSuccess] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      const { error } = await updateProfile({
        full_name: fullName,
        phone,
        address,
        city,
        state,
        postal_code: postalCode
      });
      
      if (error) {
        setProfileError(error.message);
      } else {
        setProfileSuccess(true);
      }
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    // Validate password strength
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationError(null);
    setNotificationSuccess(false);
    setNotificationLoading(true);

    try {
      // In a real app, this would update all alert configurations for the user's meters
      // For now, we'll just simulate success
      
      setTimeout(() => {
        setNotificationSuccess(true);
        setNotificationLoading(false);
      }, 1000);
    } catch (err: any) {
      setNotificationError(err.message || 'An error occurred');
      setNotificationLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm !== user?.email) {
      setDeleteError('Please enter your email correctly to confirm');
      return;
    }
    
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      // Delete user data first
      if (user?.id) {
        // This will cascade delete due to our RLS policies
        await supabase
          .from('meters')
          .delete()
          .eq('user_id', user.id);
        
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id);
        
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id);
        
        await supabase
          .from('alert_configurations')
          .delete()
          .eq('user_id', user.id);
        
        await supabase
          .from('reports')
          .delete()
          .eq('user_id', user.id);
      }
      
      // Delete the user account
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');
      
      if (error) {
        setDeleteError(error.message);
      } else {
        // Sign out after successful deletion
        await signOut();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="grid gap-6">
        <Tabs defaultValue="profile">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  {profileError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{profileError}</AlertDescription>
                    </Alert>
                  )}
                  {profileSuccess && (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>Profile updated successfully</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal-code">Postal Code</Label>
                    <Input
                      id="postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                  {passwordError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}
                  {passwordSuccess && (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>Password updated successfully</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deleteError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                )}
                <div>
                  <h3 className="text-lg font-medium mb-2">Delete Account</h3>
                  <p className="text-muted-foreground mb-4">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">
                      Type your email <span className="font-medium">{user?.email}</span> to confirm
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteAccountConfirm}
                      onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                      placeholder={user?.email || ''}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteAccountConfirm !== user?.email}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateNotifications}>
                <CardContent className="space-y-6">
                  {notificationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{notificationError}</AlertDescription>
                    </Alert>
                  )}
                  {notificationSuccess && (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>Notification preferences updated successfully</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Notification Channels</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="email-notifications" className="cursor-pointer">Email Notifications</Label>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="push-notifications" className="cursor-pointer">Push Notifications</Label>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="sms-notifications" className="cursor-pointer">SMS Notifications</Label>
                      </div>
                      <Switch
                        id="sms-notifications"
                        checked={smsNotifications}
                        onCheckedChange={setSmsNotifications}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Alert Types</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="low-balance-alerts" className="cursor-pointer">Low Balance Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when your prepaid meter balance is low</p>
                      </div>
                      <Switch
                        id="low-balance-alerts"
                        checked={lowBalanceAlerts}
                        onCheckedChange={setLowBalanceAlerts}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="high-consumption-alerts" className="cursor-pointer">High Consumption Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified about unusual consumption patterns</p>
                      </div>
                      <Switch
                        id="high-consumption-alerts"
                        checked={highConsumptionAlerts}
                        onCheckedChange={setHighConsumptionAlerts}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="bill-reminder-alerts" className="cursor-pointer">Bill Reminder Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get reminders about upcoming and overdue bills</p>
                      </div>
                      <Switch
                        id="bill-reminder-alerts"
                        checked={billReminderAlerts}
                        onCheckedChange={setBillReminderAlerts}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={notificationLoading}>
                    {notificationLoading ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

export default Settings;