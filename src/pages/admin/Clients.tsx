
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminClients = () => {
  return (
    <DashboardLayout title="Manage Clients" adminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Clients Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Client management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminClients;