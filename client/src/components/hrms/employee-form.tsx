import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Department } from "./department-manager";
import type { Designation } from "./designation-manager";

type Employee = any;

interface Props {
  defaultValues?: Employee;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
}

const EMPLOYMENT_TYPES = [
  { v: "full_time", l: "Full-time" },
  { v: "part_time", l: "Part-time" },
  { v: "contract", l: "Contract" },
  { v: "intern", l: "Intern" },
];
const STATUSES = [
  { v: "active", l: "Active" },
  { v: "on_leave", l: "On Leave" },
  { v: "resigned", l: "Resigned" },
  { v: "terminated", l: "Terminated" },
];

export default function EmployeeForm({ defaultValues, onSubmit, isSubmitting, mode = "create" }: Props) {
  const d = defaultValues || {};
  const [form, setForm] = useState<any>({
    employeeCode: d.employeeCode || "",
    firstName: d.firstName || "",
    lastName: d.lastName || "",
    email: d.email || "",
    phone: d.phone || "",
    gender: d.gender || "",
    dateOfBirth: d.dateOfBirth || "",
    dateOfJoining: d.dateOfJoining || "",
    departmentId: d.departmentId ? String(d.departmentId) : "none",
    designationId: d.designationId ? String(d.designationId) : "none",
    managerId: d.managerId ? String(d.managerId) : "none",
    employmentType: d.employmentType || "full_time",
    workLocation: d.workLocation || "",
    status: d.status || "active",
    ctc: d.ctc || "",
    basicSalary: d.basicSalary || "",
    bankName: d.bankName || "",
    bankAccountNumber: d.bankAccountNumber || "",
    ifscCode: d.ifscCode || "",
    panNumber: d.panNumber || "",
    aadharNumber: d.aadharNumber || "",
    address: d.address || "",
    city: d.city || "",
    state: d.state || "",
    country: d.country || "India",
    pincode: d.pincode || "",
    notes: d.notes || "",
  });

  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: designations = [] } = useQuery<Designation[]>({ queryKey: ["/api/designations"] });
  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    ["departmentId", "designationId", "managerId"].forEach((k) => {
      payload[k] = form[k] && form[k] !== "none" ? Number(form[k]) : null;
    });
    // empty strings -> undefined so they don't overwrite with blanks unnecessarily
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    onSubmit(payload);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-[#800000] border-b pb-1">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
  const Field = ({ label, k, type = "text", placeholder }: any) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} placeholder={placeholder} value={form[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Basic Information">
        <Field label="Employee Code *" k="employeeCode" placeholder="EMP001" />
        <Field label="First Name *" k="firstName" />
        <Field label="Last Name" k="lastName" />
        <Field label="Email" k="email" type="email" />
        <Field label="Phone" k="phone" />
        <div>
          <Label className="text-xs">Gender</Label>
          <Select value={form.gender || "unspecified"} onValueChange={(v) => set("gender", v === "unspecified" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unspecified">Unspecified</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Date of Birth" k="dateOfBirth" type="date" />
      </Section>

      <Section title="Job Details">
        <Field label="Date of Joining" k="dateOfJoining" type="date" />
        <div>
          <Label className="text-xs">Department</Label>
          <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {departments.map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Designation</Label>
          <Select value={form.designationId} onValueChange={(v) => set("designationId", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {designations.map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Reporting Manager</Label>
          <Select value={form.managerId} onValueChange={(v) => set("managerId", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {employees.filter((e) => !d.id || e.id !== d.id).map((x) => <SelectItem key={x.id} value={String(x.id)}>{x.firstName} {x.lastName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Employment Type</Label>
          <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EMPLOYMENT_TYPES.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Field label="Work Location" k="workLocation" />
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Compensation">
        <Field label="Annual CTC (₹)" k="ctc" type="number" />
        <Field label="Monthly Basic (₹)" k="basicSalary" type="number" placeholder="auto if blank" />
      </Section>

      <Section title="Bank & Statutory">
        <Field label="Bank Name" k="bankName" />
        <Field label="Account Number" k="bankAccountNumber" />
        <Field label="IFSC Code" k="ifscCode" />
        <Field label="PAN" k="panNumber" />
        <Field label="Aadhar" k="aadharNumber" />
      </Section>

      <Section title="Address">
        <Field label="Address" k="address" />
        <Field label="City" k="city" />
        <Field label="State" k="state" />
        <Field label="Country" k="country" />
        <Field label="Pincode" k="pincode" />
      </Section>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="bg-[#800000] hover:bg-[#4B0000]">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Update Employee" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}
