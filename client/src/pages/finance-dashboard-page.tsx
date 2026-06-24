import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, DollarSign, BookOpen, FileText } from "lucide-react";

function KpiCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4 text-white" /></div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₹{value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<any>({ queryKey: ["/api/finance/summary"] });
  const { data: accounts = [], isLoading: accLoading } = useQuery<any[]>({ queryKey: ["/api/accounts"] });

  const assets = summary?.assets ?? 0;
  const liabilities = summary?.liabilities ?? 0;
  const equity = summary?.equity ?? 0;
  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const netEquity = assets - liabilities;
  const netRevenue = income - expense;

  const ACCOUNT_TYPES = ["assets", "liabilities", "equity", "income", "expense"] as const;

  return (
    <Layout>
      <PageHeader title="Finance Dashboard" subtitle="Overview of your financial position" actions={
        <div className="flex gap-2">
          <Link href="/accounts"><Button variant="outline"><BookOpen className="mr-2 h-4 w-4" />Chart of Accounts</Button></Link>
          <Link href="/journal-entries"><Button variant="outline"><FileText className="mr-2 h-4 w-4" />Journal Entries</Button></Link>
        </div>
      } />
      <div className="p-6 space-y-6">
        {summaryLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard title="Total Assets" value={assets} icon={TrendingUp} color="bg-blue-500" />
            <KpiCard title="Total Liabilities" value={liabilities} icon={TrendingDown} color="bg-red-500" />
            <KpiCard title="Net Equity" value={netEquity} icon={DollarSign} color={netEquity >= 0 ? "bg-green-500" : "bg-orange-500"} />
            <KpiCard title="Net Revenue" value={netRevenue} icon={TrendingUp} color={netRevenue >= 0 ? "bg-emerald-500" : "bg-amber-500"} />
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Account Balances by Type</CardTitle></CardHeader>
          <CardContent>
            {accLoading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Accounts</TableHead><TableHead className="text-right">Total Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ACCOUNT_TYPES.map(type => {
                    const typeAccounts = accounts.filter(a => a.type === type);
                    const total = typeAccounts.reduce((s, a) => s + (parseFloat(a.currentBalance) || 0), 0);
                    return (
                      <TableRow key={type}>
                        <TableCell className="capitalize font-medium">{type}</TableCell>
                        <TableCell>{typeAccounts.length}</TableCell>
                        <TableCell className="text-right font-mono">₹{total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">P&L Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Income</span><span className="font-medium text-green-600">₹{income.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Expense</span><span className="font-medium text-red-600">₹{expense.toFixed(2)}</span></div>
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Net Revenue</span><span className={netRevenue >= 0 ? "text-green-600" : "text-red-600"}>₹{netRevenue.toFixed(2)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Balance Sheet Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Assets</span><span className="font-medium">₹{assets.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Liabilities</span><span className="font-medium">₹{liabilities.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Equity (capital)</span><span className="font-medium">₹{equity.toFixed(2)}</span></div>
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Net Equity</span><span className={netEquity >= 0 ? "text-green-600" : "text-red-600"}>₹{netEquity.toFixed(2)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
