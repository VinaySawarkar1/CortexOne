import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: companies = [] } = useQuery<any[]>({ queryKey: ["/api/companies"], enabled: currentUser?.role === 'superuser' });
  const [formOpen, setFormOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  // Calculate user count for company admin
  const companyUsers = currentUser?.role === 'admin' && currentUser?.companyId
    ? users.filter(u => u.companyId === currentUser.companyId)
    : [];
  const userCount = companyUsers.length;
  const maxUsers = 20;
  const canCreateUser = currentUser?.role === 'superuser' || (currentUser?.role === 'admin' && userCount < maxUsers);

  const displayedUsers = currentUser?.role === 'superuser'
    ? users
    : currentUser?.role === 'admin' && currentUser?.companyId
      ? users.filter((u: any) => u.companyId === currentUser.companyId)
      : users.filter((u: any) => u.id === currentUser?.id || (u as any).parentUserId === currentUser?.id);

  const createUser = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/users", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setFormOpen(false);
      toast({ title: "User Created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const featureList = [
    "dashboard","leads","customers","quotations","orders","invoices","payments","reports",
    "inventory","manufacturing","purchase orders","tasks","employee activities","support tickets","settings"
  ];

  return (
    <Layout>
      <div className="page-body">
        <PageHeader title="User Management" subtitle="Approve users, create sub-users, and assign permissions" />

        <div className="mb-4 flex justify-between items-center">
          {currentUser?.role === 'admin' && (
            <Alert className="max-w-md">
              <AlertDescription>
                Users: <strong>{userCount}/{maxUsers}</strong> 
                {userCount >= maxUsers && <span className="text-red-600 ml-2">(Limit reached)</span>}
              </AlertDescription>
            </Alert>
          )}
          {canCreateUser && (
            <Button onClick={() => setFormOpen(v => !v)}>
              {formOpen ? 'Close' : currentUser?.role === 'superuser' ? 'Create User' : 'Create Sub-User'}
            </Button>
          )}
        </div>

        {formOpen && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Create Sub-User</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                const payload = {
                  username: fd.get('username') as string,
                  password: fd.get('password') as string,
                  name: fd.get('name') as string,
                  email: fd.get('email') as string,
                  phone: fd.get('phone') as string,
                  role: currentUser?.role === 'superuser' ? (fd.get('role') as string) : 'user',
                  isActive: (fd.get('isActive') as any) === 'on',
                  permissions,
                  department: fd.get('department') as string,
                };
                if (currentUser?.role !== 'superuser' && userCount >= maxUsers) {
                  toast({ title: "Error", description: "Maximum 20 users per company reached", variant: "destructive" });
                  return;
                }
                createUser.mutate(payload);
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input name="username" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input name="password" type="password" required />
                  </div>
                  {currentUser?.role === 'superuser' && (
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select name="role" className="border rounded px-3 py-2 w-full" defaultValue="user">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superuser">Superuser</option>
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input name="department" placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input name="phone" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {featureList.map(f => (
                      <label key={f} className="text-sm flex items-center gap-2"><input type="checkbox" checked={permissions.includes(f)} onChange={(e) => {
                        setPermissions(prev => e.target.checked ? [...prev, f] : prev.filter(x => x !== f));
                      }} /> {f}</label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-sm flex items-center gap-2"><input type="checkbox" name="isActive" /> Active</label>
                  <Button type="submit" disabled={createUser.isPending}>Create</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Username</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Role</th>
                    {currentUser?.role === 'superuser' && <th className="p-2">Company</th>}
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map((u: any) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">{u.name}</td>
                      <td className="p-2">{u.username}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">
                        <Badge variant={u.role === 'superuser' ? 'default' : u.role === 'admin' ? 'secondary' : 'outline'}>
                          {u.role}
                        </Badge>
                      </td>
                      {currentUser?.role === 'superuser' && (
                        <td className="p-2">{u.companyId ? ((companies as any[]).find((c: any) => c.id === u.companyId)?.name || `Company ${u.companyId}`) : 'No Company'}</td>
                      )}
                      <td className="p-2">
                        <Badge variant={u.isActive ? 'default' : 'destructive'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateUser.mutate({ id: u.id, updates: { isActive: !u.isActive } })}
                          disabled={currentUser?.role !== 'superuser' && u.companyId !== currentUser?.companyId}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        {currentUser?.role === 'superuser' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="ml-2"
                            onClick={() => {
                              if (u.id === currentUser.id) {
                                toast({ title: 'Error', description: 'Cannot delete your own account', variant: 'destructive' });
                                return;
                              }
                              if (window.confirm(`Delete user ${u.username || u.name}? This cannot be undone.`)) {
                                deleteUser.mutate(u.id);
                              }
                            }}
                            disabled={u.id === currentUser.id}
                          >
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}














