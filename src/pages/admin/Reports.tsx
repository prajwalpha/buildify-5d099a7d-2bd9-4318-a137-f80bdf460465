
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminReports = () => {
  return (
    <DashboardLayout title="Admin Reports" adminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Reports Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Reports management functionality will be implemented here.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminReports;