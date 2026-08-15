"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";

interface CompanySelectorProps {
  organizationId: string;
  value?: string | null;
  onChange: (companyId: string | null) => void;
  placeholder?: string;
}

export function CompanySelector({
  organizationId,
  value,
  onChange,
  placeholder = "Select a company",
}: CompanySelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: companies = [], isLoading } = trpc.company.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const selected = companies.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading companies…
            </div>
          )}
          {!isLoading && companies.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No companies yet. Add one in the Companies section.
            </div>
          )}
          {/* None option */}
          {companies.length > 0 && (
            <button
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                !value && "bg-accent/50",
              )}
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
              <span className="text-muted-foreground italic">No company</span>
            </button>
          )}
          {companies.map((company) => (
            <button
              key={company.id}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                value === company.id && "bg-accent/50",
              )}
              onClick={() => { onChange(company.id); setOpen(false); }}
            >
              <Check className={cn("h-4 w-4 shrink-0", value === company.id ? "opacity-100" : "opacity-0")} />
              <div className="flex flex-col items-start min-w-0">
                <span className="truncate font-medium">{company.name}</span>
                {company.industry && (
                  <span className="text-xs text-muted-foreground truncate">{company.industry}</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="border-t p-1">
          <a
            href="/dashboard/companies"
            className="flex items-center gap-2 rounded px-3 py-2 text-sm text-primary hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
            Manage companies
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
