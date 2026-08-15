"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useOrg } from "@/components/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, Loader2, MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react";
import { COMPANY_INDUSTRIES, COMPANY_SIZES } from "@/lib/constants";

type CompanyFormState = {
  name: string;
  website: string;
  industry: string;
  size: string;
  notes: string;
};

const emptyForm = (): CompanyFormState => ({
  name: "",
  website: "",
  industry: "",
  size: "",
  notes: "",
});

export default function CompaniesPage() {
  const { toast } = useToast();
  const { currentOrg } = useOrg();
  const utils = trpc.useUtils();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyFormState>(emptyForm());

  const companiesQuery = trpc.company.list.useQuery(
    { organizationId: currentOrg?.id ?? "" },
    { enabled: !!currentOrg },
  );

  const createMutation = trpc.company.create.useMutation({
    onSuccess: () => {
      toast({ title: "Company added" });
      setCreateOpen(false);
      setForm(emptyForm());
      utils.company.list.invalidate();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      toast({ title: "Company updated" });
      setEditId(null);
      setForm(emptyForm());
      utils.company.list.invalidate();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = trpc.company.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Company deleted" });
      utils.company.list.invalidate();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No organization selected
      </div>
    );
  }

  const companies = companiesQuery.data ?? [];

  function openEdit(company: (typeof companies)[0]) {
    setEditId(company.id);
    setForm({
      name: company.name,
      website: company.website ?? "",
      industry: company.industry ?? "",
      size: company.size ?? "",
      notes: company.notes ?? "",
    });
  }

  function handleSubmit(isEdit: boolean) {
    if (isEdit && editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate({ organizationId: currentOrg!.id, ...form });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const FormFields = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Company Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Acme Corp"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={form.industry} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_INDUSTRIES.map((i) => (
                <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Company Size</Label>
          <Select value={form.size} onValueChange={(v) => setForm((f) => ({ ...f, size: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Website</Label>
        <Input
          value={form.website}
          onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          placeholder="https://example.com"
          type="url"
        />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Internal notes about this company..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            Manage client companies and link interviews to them.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setForm(emptyForm()); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Company</DialogTitle>
            </DialogHeader>
            <FormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit(false)} disabled={isPending || !form.name.trim()}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => { if (!o) { setEditId(null); setForm(emptyForm()); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditId(null); setForm(emptyForm()); }}>Cancel</Button>
            <Button onClick={() => handleSubmit(true)} disabled={isPending || !form.name.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {companies.length === 0 && !companiesQuery.isLoading ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">No companies yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first company to start organizing interviews by client.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => {
            const industryLabel = COMPANY_INDUSTRIES.find((i) => i.value === company.industry)?.label;
            const sizeLabel = COMPANY_SIZES.find((s) => s.value === company.size)?.label;
            return (
              <Card key={company.id} className="relative group">
                <CardHeader className="pb-2 pr-10">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{company.name}</CardTitle>
                      {industryLabel && (
                        <p className="text-xs text-muted-foreground mt-0.5">{industryLabel}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {sizeLabel && <span>{sizeLabel}</span>}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {company._count.interviews}{" "}
                    {company._count.interviews === 1 ? "interview" : "interviews"}
                  </p>
                </CardContent>
                <div className="absolute right-3 top-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(company)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: company.id })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
