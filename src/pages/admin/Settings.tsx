
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminSettings = () => {
  return (
    <DashboardLayout title="Admin Settings" adminLayout>
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>System settings functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminSettings;