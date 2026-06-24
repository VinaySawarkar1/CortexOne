import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { applyTheme, getThemeConfig } from "@/lib/theme-fallback";
import { useEffect } from "react";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import AppsPage from "@/pages/apps-page";
import DashboardPage from "@/pages/dashboard-page";
import CrmDashboardPage from "@/pages/crm-dashboard-page";
import ActivitiesPage from "@/pages/activities-page";
import EmailTemplatesPage from "@/pages/email-templates-page";
import LeadsPage from "@/pages/leads-page";
import CrmPipelinePage from "@/pages/crm-pipeline-page";
import EmployeesPage from "@/pages/employees-page";
import AttendancePage from "@/pages/attendance-page";
import LeavesPage from "@/pages/leaves-page";
import PayrollPage from "@/pages/payroll-page";
import WarehousesPage from "@/pages/warehouses-page";
import StockPage from "@/pages/stock-page";
import TransfersPage from "@/pages/transfers-page";
import OrdersPage from "@/pages/orders-page";
import InventoryPage from "@/pages/inventory-page";
import TasksPage from "@/pages/tasks-page";
import EmployeeActivitiesPage from "@/pages/employee-activities-page";
import ReportsPage from "@/pages/reports-page";
import CustomersPage from "@/pages/customers-page";
import QuotationsPage from "@/pages/quotations-page";
import QuotationFormPage from "@/pages/quotation-form-page";
import InvoicesPage from "@/pages/invoices-page";
import InvoiceFormPage from "@/pages/invoice-form-page";
import PaymentsPage from "@/pages/payments-page";
import PurchaseOrdersPage from "@/pages/purchase-orders-page";
import PurchaseOrderFormPage from "@/pages/purchase-order-form-page";
import SalesTargetsPage from "@/pages/sales-targets-page";
import ManufacturingPage from "@/pages/manufacturing-page";
import SettingsPage from "@/pages/settings-page";
import UsersPage from "@/pages/users-page";
import ApprovalsPage from "@/pages/approvals-page";
import ProformaFormPage from "@/pages/proforma-form-page";
import WorkCentresPage from "@/pages/work-centres-page";
import BomPage from "@/pages/bom-page";
import ProductionOrdersPage from "@/pages/production-orders-page";
import RfqPage from "@/pages/rfq-page";
import GrnPage from "@/pages/grn-page";
import DeliveryOrdersPage from "@/pages/delivery-orders-page";
import PriceListsPage from "@/pages/price-lists-page";
import AppraisalsPage from "@/pages/appraisals-page";
import ExpenseClaimsPage from "@/pages/expense-claims-page";
import RecruitmentPage from "@/pages/recruitment-page";
import FinanceDashboardPage from "@/pages/finance-dashboard-page";
import AccountsPage from "@/pages/accounts-page";
import JournalEntriesPage from "@/pages/journal-entries-page";
import SupportTicketsPage from "@/pages/support-tickets-page";
import DiscussPage from "@/pages/discuss-page";
import EmployeePortalPage from "@/pages/employee-portal-page";

import NotFoundPage from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { queryClient } from "./lib/queryClient";

function App() {
  // Apply theme on app load
  useEffect(() => {
    const theme = getThemeConfig();
    applyTheme(theme);
  }, []);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/auth" component={AuthPage} />
          <ProtectedRoute path="/apps" component={AppsPage} />
          <ProtectedRoute path="/dashboard" component={DashboardPage} />
          <ProtectedRoute path="/crm-dashboard" component={CrmDashboardPage} />
          <ProtectedRoute path="/activities" component={ActivitiesPage} />
          <ProtectedRoute path="/email-templates" component={EmailTemplatesPage} />
          <ProtectedRoute path="/leads" component={LeadsPage} />
          <ProtectedRoute path="/pipeline" component={CrmPipelinePage} />
          <ProtectedRoute path="/employees" component={EmployeesPage} />
          <ProtectedRoute path="/attendance" component={AttendancePage} />
          <ProtectedRoute path="/leaves" component={LeavesPage} />
          <ProtectedRoute path="/payroll" component={PayrollPage} />
          <ProtectedRoute path="/warehouses" component={WarehousesPage} />
          <ProtectedRoute path="/stock" component={StockPage} />
          <ProtectedRoute path="/transfers" component={TransfersPage} />
          <ProtectedRoute path="/orders" component={OrdersPage} />
          <ProtectedRoute path="/inventory" component={InventoryPage} />
          <ProtectedRoute path="/tasks" component={TasksPage} />
          <ProtectedRoute path="/employee-activities" component={EmployeeActivitiesPage} />
          <ProtectedRoute path="/reports" component={ReportsPage} />
          <ProtectedRoute path="/customers" component={CustomersPage} />
          <ProtectedRoute path="/quotations" component={QuotationsPage} />
          <ProtectedRoute path="/quotations/new" component={QuotationFormPage} />
          <ProtectedRoute path="/quotations/edit/:id" component={QuotationFormPage} />
          <ProtectedRoute path="/proforma/new" component={ProformaFormPage} />
          <ProtectedRoute path="/proforma/edit/:id" component={ProformaFormPage} />
          <ProtectedRoute path="/invoices" component={InvoicesPage} />
          <ProtectedRoute path="/invoices/new" component={InvoiceFormPage} />
          <ProtectedRoute path="/invoices/edit/:id" component={InvoiceFormPage} />
          <ProtectedRoute path="/payments" component={PaymentsPage} />
          <ProtectedRoute path="/purchase-orders" component={PurchaseOrdersPage} />
          <ProtectedRoute path="/purchase-orders/new" component={PurchaseOrderFormPage} />
          <ProtectedRoute path="/purchase-orders/edit/:id" component={PurchaseOrderFormPage} />
          <ProtectedRoute path="/sales-targets" component={SalesTargetsPage} />
          <ProtectedRoute path="/manufacturing" component={ManufacturingPage} />
          <ProtectedRoute path="/work-centres" component={WorkCentresPage} />
          <ProtectedRoute path="/bom" component={BomPage} />
          <ProtectedRoute path="/production-orders" component={ProductionOrdersPage} />
          <ProtectedRoute path="/rfq" component={RfqPage} />
          <ProtectedRoute path="/grn" component={GrnPage} />
          <ProtectedRoute path="/delivery-orders" component={DeliveryOrdersPage} />
          <ProtectedRoute path="/price-lists" component={PriceListsPage} />
          <ProtectedRoute path="/appraisals" component={AppraisalsPage} />
          <ProtectedRoute path="/expenses" component={ExpenseClaimsPage} />
          <ProtectedRoute path="/recruitment" component={RecruitmentPage} />
          <ProtectedRoute path="/finance-dashboard" component={FinanceDashboardPage} />
          <ProtectedRoute path="/accounts" component={AccountsPage} />
          <ProtectedRoute path="/journal-entries" component={JournalEntriesPage} />
          <ProtectedRoute path="/support-tickets" component={SupportTicketsPage} />
          <ProtectedRoute path="/discuss" component={DiscussPage} />
          <ProtectedRoute path="/employee-portal" component={EmployeePortalPage} />
          <ProtectedRoute path="/settings" component={SettingsPage} />
          <ProtectedRoute path="/users" component={UsersPage} />
          <ProtectedRoute path="/approvals" component={ApprovalsPage} />

          <Route component={NotFoundPage} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
