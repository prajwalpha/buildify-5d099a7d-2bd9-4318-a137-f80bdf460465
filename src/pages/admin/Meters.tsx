
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminMeters = () => {
  return (
    <DashboardLayout title="Manage Meters" adminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Meters Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Meter management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminMeters;