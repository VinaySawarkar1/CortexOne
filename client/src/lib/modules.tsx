import {
  LayoutDashboard, UserPlus, KanbanSquare, Building2, BarChart3,
  FileText, ShoppingCart, Receipt, CreditCard, Target,
  Package, Warehouse, Boxes, ArrowRightLeft, Factory, Truck,
  IdCard, CalendarCheck, Plane, Wallet,
  ClipboardList, Users, HelpCircle, Settings, CheckCircle2,
  Contact, Mail, Activity, type LucideIcon,
  Settings2, FileSearch, PackageCheck, Send, Tag, Star,
  DollarSign, BookOpen, BookText, MessageSquare, User,
} from "lucide-react";

export interface ModuleItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface AppModule {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** tailwind gradient classes for the icon tile */
  color: string;
  items: ModuleItem[];
}

export const MODULES: AppModule[] = [
  {
    id: "crm",
    name: "CRM",
    tagline: "Win more deals",
    description: "Track leads, manage a visual sales pipeline, schedule activities and convert opportunities into customers.",
    icon: Contact,
    color: "from-blue-500 to-indigo-600",
    items: [
      { title: "CRM Dashboard", href: "/crm-dashboard", icon: LayoutDashboard },
      { title: "Leads", href: "/leads", icon: UserPlus },
      { title: "Pipeline", href: "/pipeline", icon: KanbanSquare },
      { title: "Activities", href: "/activities", icon: Activity },
      { title: "Customers", href: "/customers", icon: Building2 },
      { title: "Email Templates", href: "/email-templates", icon: Mail },
      { title: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    tagline: "Quote to cash",
    description: "Create quotations and proformas, confirm orders, raise invoices, record payments and track sales targets.",
    icon: ShoppingCart,
    color: "from-amber-500 to-orange-600",
    items: [
      { title: "Quotations", href: "/quotations", icon: FileText },
      { title: "Orders", href: "/orders", icon: ShoppingCart },
      { title: "Invoices", href: "/invoices", icon: Receipt },
      { title: "Payments", href: "/payments", icon: CreditCard },
      { title: "Sales Targets", href: "/sales-targets", icon: Target },
      { title: "Delivery Orders", href: "/delivery-orders", icon: Send },
      { title: "Price Lists", href: "/price-lists", icon: Tag },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    tagline: "Know your stock",
    description: "Manage products, warehouses and locations, track on-hand quantities, run stock moves and transfers.",
    icon: Boxes,
    color: "from-teal-500 to-emerald-600",
    items: [
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Warehouses", href: "/warehouses", icon: Warehouse },
      { title: "Stock", href: "/stock", icon: Boxes },
      { title: "Transfers", href: "/transfers", icon: ArrowRightLeft },
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing",
    tagline: "Build it",
    description: "Plan and track manufacturing jobs and production output.",
    icon: Factory,
    color: "from-rose-500 to-pink-600",
    items: [
      { title: "Manufacturing", href: "/manufacturing", icon: Factory },
      { title: "Bill of Materials", href: "/bom", icon: ClipboardList },
      { title: "Work Centres", href: "/work-centres", icon: Settings2 },
      { title: "Production Orders", href: "/production-orders", icon: Factory },
    ],
  },
  {
    id: "purchasing",
    name: "Purchasing",
    tagline: "Source & procure",
    description: "Raise and manage purchase orders to your suppliers.",
    icon: Truck,
    color: "from-violet-500 to-purple-600",
    items: [
      { title: "RFQ", href: "/rfq", icon: FileSearch },
      { title: "Purchase Orders", href: "/purchase-orders", icon: Truck },
      { title: "Goods Receipt", href: "/grn", icon: PackageCheck },
    ],
  },
  {
    id: "hr",
    name: "Human Resources",
    tagline: "People first",
    description: "Maintain employee records, departments, attendance, leave approvals and run payroll.",
    icon: IdCard,
    color: "from-fuchsia-500 to-rose-600",
    items: [
      { title: "Employees", href: "/employees", icon: IdCard },
      { title: "Attendance", href: "/attendance", icon: CalendarCheck },
      { title: "Leaves", href: "/leaves", icon: Plane },
      { title: "Payroll", href: "/payroll", icon: Wallet },
      { title: "My Portal", href: "/employee-portal", icon: User },
      { title: "Appraisals", href: "/appraisals", icon: Star },
      { title: "Expenses", href: "/expenses", icon: Receipt },
      { title: "Recruitment", href: "/recruitment", icon: UserPlus },
    ],
  },
  {
    id: "productivity",
    name: "Productivity",
    tagline: "Get things done",
    description: "Assign tasks, log employee activities and handle support tickets.",
    icon: ClipboardList,
    color: "from-cyan-500 to-blue-600",
    items: [
      { title: "Tasks", href: "/tasks", icon: ClipboardList },
      { title: "Employee Activities", href: "/employee-activities", icon: Users },
      { title: "Support Tickets", href: "/support-tickets", icon: HelpCircle },
      { title: "Discuss", href: "/discuss", icon: MessageSquare },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    tagline: "Books & accounting",
    description: "Chart of accounts, journal entries, P&L and balance sheet.",
    icon: DollarSign,
    color: "from-emerald-500 to-green-600",
    items: [
      { title: "Finance Dashboard", href: "/finance-dashboard", icon: LayoutDashboard },
      { title: "Chart of Accounts", href: "/accounts", icon: BookOpen },
      { title: "Journal Entries", href: "/journal-entries", icon: BookText },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    tagline: "Administer",
    description: "Configure the company, manage users and access, and review approvals.",
    icon: Settings,
    color: "from-slate-500 to-gray-700",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Users", href: "/users", icon: Users },
      { title: "Approvals", href: "/approvals", icon: CheckCircle2 },
    ],
  },
];

/** Replicates the role/permission rules used across the app. */
export function canAccessTitle(user: any, title: string): boolean {
  if (!user) return false;
  if (user.role === "superuser") return true;
  if (title === "Approvals") return false; // superuser only
  if (user.role === "admin") return true;
  const perms = user.permissions as string[] | undefined;
  if (Array.isArray(perms) && perms.length > 0) {
    return perms.includes(title.toLowerCase());
  }
  const salesOnly = ["CRM Dashboard", "Dashboard", "Leads", "Pipeline", "Activities", "Customers", "Quotations", "Orders", "Invoices", "Payments", "Reports", "Email Templates"];
  if (user.role === "sales") return salesOnly.includes(title);
  return true;
}

/** Items within a module the user may see. */
export function accessibleItems(user: any, module: AppModule): ModuleItem[] {
  return module.items.filter((i) => canAccessTitle(user, i.title));
}

/** Modules with at least one accessible item. */
export function getAccessibleModules(user: any): AppModule[] {
  return MODULES.filter((m) => accessibleItems(user, m).length > 0);
}

/** Find the module that owns a given route path (longest href match wins). */
export function getModuleForPath(path: string): AppModule | undefined {
  let best: { module: AppModule; len: number } | undefined;
  for (const m of MODULES) {
    for (const item of m.items) {
      if (path === item.href || path.startsWith(item.href + "/")) {
        if (!best || item.href.length > best.len) best = { module: m, len: item.href.length };
      }
    }
  }
  return best?.module;
}
