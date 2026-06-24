import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Users, CheckCircle2, XCircle } from "lucide-react";

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery<{ companies: any[]; users: any[] }>({
    queryKey: ["/api/pending-approvals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/pending-approvals");
      const json = await res.json();
      console.log('Approvals query response:', json);
      return json;
    },
    enabled: user?.role === 'superuser',
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
  });

  const approveCompany = useMutation({
    mutationFn: async (companyId: number) => {
      const res = await apiRequest("POST", `/api/approve-company/${companyId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Company Approved", description: "Company and admin user have been activated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const rejectCompany = useMutation({
    mutationFn: async (companyId: number) => {
      const res = await apiRequest("DELETE", `/api/companies/${companyId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-approvals"] });
      toast({ title: "Company Rejected", description: "Company and pending users have been removed." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (user?.role !== 'superuser') {
    return (
      <Layout>
        <div className="page-body">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Access denied. Superuser only.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Auto-refetch when user becomes superuser
  useEffect(() => {
    if (user?.role === 'superuser') {
      refetch();
    }
  }, [user?.role, refetch]);

  const companies = data?.companies || [];
  const users = data?.users || [];

  return (
    <Layout>
      <div className="page-body">
        <div className="flex justify-between items-center mb-4">
          <PageHeader 
            title="Pending Approvals" 
            subtitle="Review and approve new company registrations"
          />
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="pt-6"><p>Loading...</p></CardContent></Card>
        ) : error ? (
          <Card><CardContent className="pt-6"><p className="text-center text-red-500">Error loading approvals: {error instanceof Error ? error.message : 'Unknown error'}</p></CardContent></Card>
        ) : companies.length === 0 && users.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-gray-500">No pending approvals</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {companies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Pending Companies ({companies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {companies.map((company) => {
                      const adminUser = users.find(u => u.companyId === company.id);
                      return (
                        <div key={company.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-lg">{company.name}</h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Email:</strong> {company.email}</p>
                                {company.phone && <p><strong>Phone:</strong> {company.phone}</p>}
                                {company.address && <p><strong>Address:</strong> {company.address}</p>}
                                <p><strong>Max Users:</strong> {company.maxUsers}</p>
                                <p><strong>Created:</strong> {new Date(company.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Pending
                            </Badge>
                          </div>
                          {adminUser && (
                            <div className="bg-gray-50 rounded p-3 space-y-1">
                              <p className="text-sm font-medium">Admin User:</p>
                              <p className="text-sm text-gray-600">{adminUser.name} ({adminUser.username})</p>
                              <p className="text-sm text-gray-600">{adminUser.email}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => approveCompany.mutate(company.id)}
                              disabled={approveCompany.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Reject and delete company "${company.name}"? This cannot be undone.`)) {
                                  rejectCompany.mutate(company.id);
                                }
                              }}
                              disabled={rejectCompany.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {users.filter(u => !companies.find(c => c.id === u.companyId)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Other Pending Users ({users.filter(u => !companies.find(c => c.id === u.companyId)).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.filter(u => !companies.find(c => c.id === u.companyId)).map((u) => (
                      <div key={u.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{u.name}</h3>
                          <p className="text-sm text-gray-600">{u.email} • {u.username}</p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Inactive
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

