"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { OptionSelect } from "@/components/shared/option-select";
import { QuickAdd } from "@/components/shared/quick-add";
import { useCan, useSession } from "@/components/session-provider";
import { STATUSES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import type { FormState } from "@/lib/actions/components";
import type { MasterEntity } from "@/lib/validations";
import type { Component, MasterOptions, Option } from "@/types/database";

type Values = Record<string, string>;

const FIELD_KEYS = [
  "name", "category_id", "quantity", "provider_id", "current_owner", "status", "received_date",
  "manufacturer", "model", "part_number", "serial_number", "vendor_id", "purchase_date", "unit_cost",
  "invoice_number", "warranty_expiry", "current_holder", "location_id", "project_id",
  "description", "specifications", "notes",
] as const;

function initialValues(c?: Partial<Component>): Values {
  const v: Values = {};
  for (const k of FIELD_KEYS) {
    const raw = c?.[k as keyof Component];
    v[k] = raw === null || raw === undefined ? "" : String(raw);
  }
  if (!c) {
    v.quantity = "1";
    v.status = "available";
    v.received_date = todayISO();
  }
  return v;
}

export function ComponentForm({
  action,
  options: initialOptions,
  component,
  suggestions,
  cancelHref,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  options: MasterOptions;
  component?: Component;
  suggestions: { owners: string[]; holders: string[] };
  cancelHref: string;
}) {
  const { currency } = useSession();
  const canManage = useCan("masters.manage");
  const [values, setValues] = useState<Values>(() => initialValues(component));
  const [options, setOptions] = useState(initialOptions);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const set = (k: string) => (v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const input = (k: string) => ({
    id: k,
    name: k,
    value: values[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k)(e.target.value),
    "aria-invalid": errors[k] ? true : undefined,
  });

  const select = (k: string, entity: MasterEntity, list: Option[], opts: { required?: boolean; placeholder: string }) => (
    <div className="flex gap-2">
      <OptionSelect
        id={k}
        value={values[k]}
        onChange={set(k)}
        options={list}
        placeholder={opts.placeholder}
        allowNone={!opts.required}
        invalid={!!errors[k]}
        className="min-w-0 flex-1"
      />
      {canManage && (
        <QuickAdd
          entity={entity}
          onCreated={(o) => {
            setOptions((prev) => ({
              ...prev,
              [entity]: [...prev[entity], o].sort((a, b) => a.name.localeCompare(b.name)),
            }));
            set(k)(o.id);
          }}
        />
      )}
    </div>
  );

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    for (const k of FIELD_KEYS) fd.set(k, values[k] ?? "");
    start(async () => {
      const res = await action(null, fd);
      // A successful save redirects, so we only get here on failure.
      if (res && !res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) document.getElementById(first)?.focus();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Essentials</CardTitle>
          <CardDescription>
            Required for every component.{" "}
            {component ? (
              <>
                The ID <span className="hw-id text-foreground">{component.hw_id}</span> is permanent.
              </>
            ) : (
              "A permanent ID like HW-000123 is assigned when you save."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Component name" htmlFor="name" required error={errors.name} className="sm:col-span-2 lg:col-span-2">
            <Input {...input("name")} placeholder="e.g. Raspberry Pi 5 (8 GB)" maxLength={200} autoFocus={!component} />
          </Field>
          <Field label="Category" htmlFor="category_id" required error={errors.category_id}>
            {select("category_id", "categories", options.categories, { required: true, placeholder: "Choose a category" })}
          </Field>
          <Field label="Quantity" htmlFor="quantity" required error={errors.quantity}>
            <Input {...input("quantity")} type="number" inputMode="numeric" min={0} step={1} className="tabular" />
          </Field>
          <Field label="Given by / source" htmlFor="provider_id" required error={errors.provider_id} hint="Who supplied or donated it">
            {select("provider_id", "providers", options.providers, { required: true, placeholder: "Choose a source" })}
          </Field>
          <Field label="Current owner" htmlFor="current_owner" required error={errors.current_owner} hint="Person, lab or department responsible">
            <Input {...input("current_owner")} list="owner-suggestions" maxLength={200} placeholder="e.g. ECE Department" />
          </Field>
          <Field label="Status" htmlFor="status" required error={errors.status}>
            <Select value={values.status} onValueChange={set("status")}>
              <SelectTrigger id="status" aria-invalid={errors.status ? true : undefined}>
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                    <span className="ml-2 text-xs text-muted-foreground">{s.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Received date" htmlFor="received_date" required error={errors.received_date}>
            <Input {...input("received_date")} type="date" max="9999-12-31" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>Optional. Leave blank if it sits in stock.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Current holder" htmlFor="current_holder" error={errors.current_holder} hint="Who physically has it right now">
            <Input {...input("current_holder")} list="holder-suggestions" maxLength={200} />
          </Field>
          <Field label="Location" htmlFor="location_id" error={errors.location_id}>
            {select("location_id", "locations", options.locations, { placeholder: "No location" })}
          </Field>
          <Field label="Project" htmlFor="project_id" error={errors.project_id}>
            {select("project_id", "projects", options.projects, { placeholder: "No project" })}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
          <CardDescription>Optional. Fill in whatever applies to this item.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Manufacturer" htmlFor="manufacturer" error={errors.manufacturer}>
            <Input {...input("manufacturer")} maxLength={200} />
          </Field>
          <Field label="Model" htmlFor="model" error={errors.model}>
            <Input {...input("model")} maxLength={200} />
          </Field>
          <Field label="Part number" htmlFor="part_number" error={errors.part_number}>
            <Input {...input("part_number")} maxLength={200} className="font-mono text-[0.8rem]" />
          </Field>
          <Field label="Serial number" htmlFor="serial_number" error={errors.serial_number}>
            <Input {...input("serial_number")} maxLength={200} className="font-mono text-[0.8rem]" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase and warranty</CardTitle>
          <CardDescription>Optional. Skip for donated or borrowed items.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Vendor" htmlFor="vendor_id" error={errors.vendor_id}>
            {select("vendor_id", "vendors", options.vendors, { placeholder: "No vendor" })}
          </Field>
          <Field label="Purchase date" htmlFor="purchase_date" error={errors.purchase_date}>
            <Input {...input("purchase_date")} type="date" max="9999-12-31" />
          </Field>
          <Field
            label={`Unit cost (${currency})`}
            htmlFor="unit_cost"
            error={errors.unit_cost}
            hint={
              values.unit_cost && Number(values.quantity) > 1 && Number.isFinite(Number(values.unit_cost))
                ? `Total ${new Intl.NumberFormat("en-IN").format(Number(values.unit_cost) * Number(values.quantity))} for ${values.quantity} units`
                : "Price of one unit"
            }
          >
            <Input {...input("unit_cost")} inputMode="decimal" placeholder="0.00" className="tabular" />
          </Field>
          <Field label="Invoice number" htmlFor="invoice_number" error={errors.invoice_number}>
            <Input {...input("invoice_number")} maxLength={100} />
          </Field>
          <Field label="Warranty until" htmlFor="warranty_expiry" error={errors.warranty_expiry}>
            <Input {...input("warranty_expiry")} type="date" max="9999-12-31" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description and notes</CardTitle>
          <CardDescription>Optional. Everything here is searchable.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Field label="Description" htmlFor="description" error={errors.description}>
            <Textarea {...input("description")} rows={4} maxLength={5000} />
          </Field>
          <Field label="Specifications" htmlFor="specifications" error={errors.specifications} hint="Voltage, interfaces, capacity…">
            <Textarea {...input("specifications")} rows={4} maxLength={10000} className="font-mono text-[0.8rem]" />
          </Field>
          <Field label="Notes" htmlFor="notes" error={errors.notes} className="lg:col-span-2">
            <Textarea {...input("notes")} rows={3} maxLength={5000} />
          </Field>
        </CardContent>
      </Card>

      <datalist id="owner-suggestions">
        {suggestions.owners.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      <datalist id="holder-suggestions">
        {suggestions.holders.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t bg-background/90 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            Fields marked <span className="text-destructive">*</span> are required.
          </p>
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {component ? "Save changes" : "Save component"}
          </Button>
        </div>
      </div>
    </form>
  );
}
