
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminBilling = () => {
  return (
    <DashboardLayout title="Billing Management" adminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Billing management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminBilling;