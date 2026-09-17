"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { PasswordInput } from "@/components/admin/password-input";
import { changeMyPassword, updateMyProfile, updateOrgSettings } from "@/lib/actions/settings";
import { CURRENCIES } from "@/lib/constants";

type Errors = Record<string, string[] | undefined>;

function SaveButton({ pending, label = "Save" }: { pending: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Save />} {label}
    </Button>
  );
}

export function ProfileForm({ fullName, email, roleName }: { fullName: string; email: string; roleName: string }) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateMyProfile(name);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setError(undefined);
          toast.success(res.message ?? "Saved");
          router.refresh();
        });
      }}
    >
      <Field label="Full name" htmlFor="p-name" required error={error}>
        <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor="p-email" hint="Ask your Super Admin to change your email or role.">
        <Input id="p-email" value={email} disabled />
      </Field>
      <Field label="Role" htmlFor="p-role">
        <Input id="p-role" value={roleName} disabled />
      </Field>
      <div>
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await changeMyPassword({ currentPassword, newPassword, confirmPassword });
          if (!res.ok) {
            setErrors(res.fieldErrors ?? { currentPassword: res.error.includes("current") ? [res.error] : undefined });
            toast.error(res.error);
            return;
          }
          setErrors({});
          setCurrent("");
          setNew("");
          setConfirm("");
          toast.success(res.message ?? "Password changed");
        });
      }}
    >
      <Field label="Current password" htmlFor="pw-current" required error={errors.currentPassword}>
        <PasswordInput id="pw-current" value={currentPassword} onChange={setCurrent} withGenerator={false} autoComplete="current-password" invalid={!!errors.currentPassword} />
      </Field>
      <Field
        label="New password"
        htmlFor="pw-new"
        required
        error={errors.newPassword}
        hint="At least 10 characters with upper and lower case letters and a number."
      >
        <PasswordInput id="pw-new" value={newPassword} onChange={setNew} invalid={!!errors.newPassword} />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm" required error={errors.confirmPassword}>
        <PasswordInput id="pw-confirm" value={confirmPassword} onChange={setConfirm} withGenerator={false} invalid={!!errors.confirmPassword} />
      </Field>
      <div>
        <SaveButton pending={pending} label="Change password" />
      </div>
    </form>
  );
}

export function OrgForm({ initial }: { initial: { org_name: string; currency: string; warranty_alert_days: number } }) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(initial.org_name);
  const [currency, setCurrency] = useState(initial.currency);
  const [days, setDays] = useState(String(initial.warranty_alert_days));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateOrgSettings({
            org_name: orgName,
            currency: currency as (typeof CURRENCIES)[number],
            warranty_alert_days: Number(days),
          });
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          setErrors({});
          toast.success(res.message ?? "Saved");
          router.refresh();
        });
      }}
    >
      <Field label="Organization name" htmlFor="o-name" required error={errors.org_name} hint="Shown in the sidebar and on reports.">
        <Input id="o-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Currency" htmlFor="o-currency" required error={errors.currency} hint="Used for costs and inventory value.">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="o-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Warranty alert (days)" htmlFor="o-days" required error={errors.warranty_alert_days} hint="Warn this many days before expiry.">
          <Input id="o-days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="tabular" />
        </Field>
      </div>
      <div>
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}
