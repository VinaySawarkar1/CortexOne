import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Mail, Loader2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "introduction", label: "Introduction" },
  { value: "follow_up", label: "Follow-up" },
  { value: "proposal", label: "Proposal" },
  { value: "closing", label: "Closing" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  introduction: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  proposal: "bg-violet-100 text-violet-700",
  closing: "bg-green-100 text-green-700",
};

const PLACEHOLDERS = [
  "{{lead_name}}", "{{company}}", "{{email}}", "{{phone}}",
  "{{assigned_to}}", "{{expected_value}}", "{{your_name}}",
];

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

function TemplateForm({ initial, onSave, onCancel, isSaving }: {
  initial?: Partial<Template>;
  onSave: (data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    subject: initial?.subject || "",
    body: initial?.body || "",
    category: initial?.category || "general",
    isActive: initial?.isActive ?? true,
  });
  const [preview, setPreview] = useState(false);

  const insertPlaceholder = (ph: string) => {
    setForm(f => ({ ...f, body: f.body + ph }));
  };

  const previewBody = form.body
    .replace(/\{\{lead_name\}\}/g, "Rajesh Kumar")
    .replace(/\{\{company\}\}/g, "Acme Pvt Ltd")
    .replace(/\{\{email\}\}/g, "rajesh@acme.com")
    .replace(/\{\{phone\}\}/g, "+91 98765 43210")
    .replace(/\{\{assigned_to\}\}/g, "Your Name")
    .replace(/\{\{expected_value\}\}/g, "₹5,00,000")
    .replace(/\{\{your_name\}\}/g, "Your Name");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Template Name <span className="text-red-500">*</span></Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Initial Introduction" />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Subject Line <span className="text-red-500">*</span></Label>
        <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Introduction from {{your_name}}" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Body</Label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setPreview(p => !p)}>
              <Eye className="h-3 w-3 mr-1" />{preview ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>
        {preview ? (
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[120px] text-sm whitespace-pre-wrap">{previewBody || <span className="text-gray-400">No content</span>}</div>
        ) : (
          <Textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={8}
            placeholder="Write your email body here. Use placeholders like {{lead_name}} for dynamic values."
            className="font-mono text-sm"
          />
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500">Insert:</span>
          {PLACEHOLDERS.map(ph => (
            <button key={ph} type="button" onClick={() => insertPlaceholder(ph)}
              className="text-[11px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 font-mono">
              {ph}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving || !form.name || !form.subject}
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initial?.id ? "Save Changes" : "Create Template"}
        </Button>
      </div>
    </div>
  );
}

export default function EmailTemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/crm-email-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/crm-email-templates", {
        ...data, createdBy: (user as any)?.username || "system",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-email-templates"] });
      setCreateOpen(false);
      toast({ title: "Template created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/crm-email-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-email-templates"] });
      setEditTemplate(null);
      toast({ title: "Template updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/crm-email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm-email-templates"] });
      setDeleteTemplate(null);
      toast({ title: "Template deleted" });
    },
  });

  const filtered = (templates as Template[]).filter(t =>
    catFilter === "all" || t.category === catFilter
  );

  return (
    <Layout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex items-center justify-between">
          <PageHeader title="Email Templates" subtitle="Reusable email templates for CRM outreach" />
          <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-2">
          {["all", ...CATEGORIES.map(c => c.value)].map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                catFilter === cat
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              )}>
              {cat === "all" ? "All" : CATEGORIES.find(c => c.value === cat)?.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-gray-50">
            <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No templates yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first email template to speed up outreach.</p>
            <Button onClick={() => setCreateOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Create Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <Card key={t.id} className={cn("group hover:shadow-md transition-shadow", !t.isActive && "opacity-60")}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", CATEGORY_COLORS[t.category] || "bg-gray-100 text-gray-700")}>
                        {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                      </span>
                      {!t.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    <CardTitle className="text-sm font-semibold truncate">{t.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTemplate(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => setDeleteTemplate(t)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-gray-600 truncate mb-1">Subject: {t.subject}</p>
                  <p className="text-xs text-gray-500 line-clamp-3">{t.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Email Template</DialogTitle>
              <DialogDescription>Create a reusable email template with dynamic placeholders.</DialogDescription>
            </DialogHeader>
            <TemplateForm
              onSave={data => createMutation.mutate(data)}
              onCancel={() => setCreateOpen(false)}
              isSaving={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>Update the email template details.</DialogDescription>
            </DialogHeader>
            {editTemplate && (
              <TemplateForm
                initial={editTemplate}
                onSave={data => updateMutation.mutate({ id: editTemplate.id, data })}
                onCancel={() => setEditTemplate(null)}
                isSaving={updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete template?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleteTemplate?.name}" will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
