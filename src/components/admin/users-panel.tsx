"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, KeyRound, Loader2, MoreHorizontal, Pencil, Search, ShieldQuestion, UserPlus, UserRoundX } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { createUser, resetUserPassword, setUserPermission, updateUser } from "@/lib/actions/admin";
import { ASSIGNABLE_ROLES, roleLabel, type AppRole, type Permission } from "@/lib/permissions";
import { cn, formatDate, initials } from "@/lib/utils";
import { PasswordInput } from "./password-input";
import type { AdminUser, PermissionDef, RoleGrant, UserOverride } from "./types";

type Assignable = Exclude<AppRole, "super_admin">;

export function UsersPanel({
  users,
  permissions,
  roleGrants,
  overrides,
  currentUserId,
}: {
  users: AdminUser[];
  permissions: PermissionDef[];
  roleGrants: RoleGrant[];
  overrides: UserOverride[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [permUser, setPermUser] = useState<AdminUser | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users.filter((u) => !t || u.email.toLowerCase().includes(t) || (u.full_name ?? "").toLowerCase().includes(t));
  }, [users, q]);

  const toggleActive = (u: AdminUser) =>
    start(async () => {
      const res = await updateUser({ id: u.id, fullName: u.full_name || u.email, role: u.role as Assignable, isActive: !u.is_active });
      if (res.ok) {
        toast.success(u.is_active ? `${u.email} can no longer sign in` : `${u.email} can sign in again`);
        router.refresh();
      } else toast.error(res.error);
    });

  const overrideCount = (id: string) => overrides.filter((o) => o.user_id === id).length;

  return (
    <>
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="h-9 pl-9" />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus /> Add user
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Access</TableHead>
            <TableHead className="hidden md:table-cell">Added</TableHead>
            <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((u) => {
            const isSuper = u.role === "super_admin";
            const overridesN = overrideCount(u.id);
            return (
              <TableRow key={u.id} className={cn(!u.is_active && "opacity-60")}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials(u.full_name ?? u.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {u.full_name ?? "—"}
                        {u.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isSuper ? (
                    <Badge>
                      <Crown className="h-3 w-3" /> Super Admin
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{roleLabel(u.role)}</Badge>
                      {overridesN > 0 && (
                        <Badge variant="outline" title="Has individual permission overrides">
                          +{overridesN} custom
                        </Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {u.is_active ? (
                    <span className="text-sm text-status-available">Active</span>
                  ) : (
                    <span className="text-sm text-status-damaged">Disabled</span>
                  )}
                </TableCell>
                <TableCell className="tabular hidden text-muted-foreground md:table-cell">{formatDate(u.created_at)}</TableCell>
                <TableCell className="text-right">
                  {!isSuper && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${u.email}`} disabled={pending}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => setEditing(u)}>
                          <Pencil /> Edit name and role
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setPermUser(u)}>
                          <ShieldQuestion /> Custom permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setResetting(u)}>
                          <KeyRound /> Reset password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => toggleActive(u)}
                          className={cn(u.is_active && "text-destructive focus:text-destructive")}
                        >
                          <UserRoundX /> {u.is_active ? "Disable account" : "Enable account"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No users match.</p>}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onDone={() => router.refresh()} />
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} onDone={() => router.refresh()} />}
      {resetting && <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />}
      {permUser && (
        <PermissionsDialog
          user={permUser}
          permissions={permissions}
          roleGrants={roleGrants}
          overrides={overrides.filter((o) => o.user_id === permUser.id)}
          onClose={() => {
            setPermUser(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RoleSelect({ value, onChange }: { value: Assignable; onChange: (v: Assignable) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Assignable)}>
      <SelectTrigger id="u-role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSIGNABLE_ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            <span className="font-medium">{r.label}</span>
            <span className="block text-xs text-muted-foreground">{r.description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreateUserDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Assignable>("staff");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole("staff");
    setPassword("");
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createUser({ email, fullName, role, password });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "User created");
      reset();
      onOpenChange(false);
      onDone();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>Add a user</DialogTitle>
            <DialogDescription>They can sign in right away. Share the password securely and ask them to change it in Settings.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Full name" htmlFor="u-name" required error={errors.fullName}>
              <Input id="u-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus maxLength={200} />
            </Field>
            <Field label="Email" htmlFor="u-email" required error={errors.email}>
              <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Role" htmlFor="u-role" required error={errors.role}>
              <RoleSelect value={role} onChange={setRole} />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="u-password"
              required
              error={errors.password}
              hint="At least 10 characters with upper and lower case letters and a number."
            >
              <PasswordInput id="u-password" value={password} onChange={setPassword} invalid={!!errors.password} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [role, setRole] = useState<Assignable>(user.role as Assignable);
  const [isActive, setIsActive] = useState(user.is_active);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateUser({ id: user.id, fullName, role, isActive });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success("User updated");
      onClose();
      onDone();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>Edit {user.email}</DialogTitle>
            <DialogDescription>Role changes take effect on the user&apos;s next page load.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Full name" htmlFor="e-name" required error={errors.fullName}>
              <Input id="e-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={200} />
            </Field>
            <Field label="Role" htmlFor="u-role" required error={errors.role}>
              <RoleSelect value={role} onChange={setRole} />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Account enabled</p>
                <p className="text-xs text-muted-foreground">Disabled users are signed out and can&apos;t sign in. Their history is kept.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Account enabled" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await resetUserPassword(user.id, password);
      if (!res.ok) {
        setError(res.fieldErrors ? Object.values(res.fieldErrors).flat()[0] ?? res.error : res.error);
        return;
      }
      toast.success(`Password reset for ${user.email}`);
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {user.email}. Copy it before closing this dialog.</DialogDescription>
          </DialogHeader>
          <Field label="New password" htmlFor="r-password" required error={error ?? undefined}>
            <PasswordInput id="r-password" value={password} onChange={setPassword} invalid={!!error} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !password}>
              {pending && <Loader2 className="animate-spin" />} Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type OverrideState = "inherit" | "grant" | "deny";

function PermissionsDialog({
  user,
  permissions,
  roleGrants,
  overrides,
  onClose,
}: {
  user: AdminUser;
  permissions: PermissionDef[];
  roleGrants: RoleGrant[];
  overrides: UserOverride[];
  onClose: () => void;
}) {
  const [state, setState] = useState<Record<string, OverrideState>>(() =>
    Object.fromEntries(overrides.map((o) => [o.permission, o.granted ? "grant" : "deny"])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const fromRole = new Set(roleGrants.filter((g) => g.role === user.role).map((g) => g.permission));

  const change = async (permission: string, next: OverrideState) => {
    const prev = state[permission] ?? "inherit";
    setState((s) => ({ ...s, [permission]: next }));
    setBusy(permission);
    const res = await setUserPermission({ userId: user.id, permission: permission as Permission, state: next });
    setBusy(null);
    if (!res.ok) {
      setState((s) => ({ ...s, [permission]: prev }));
      toast.error(res.error);
    }
  };

  const groups = Array.from(new Set(permissions.map((p) => p.group_name)));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Custom permissions for {user.full_name ?? user.email}</DialogTitle>
          <DialogDescription>
            By default this user gets what the {roleLabel(user.role)} role allows. Override single permissions here; changes save immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
              <ul className="divide-y rounded-md border">
                {permissions
                  .filter((p) => p.group_name === g)
                  .map((p) => {
                    const s = state[p.key] ?? "inherit";
                    const effective = s === "grant" || (s === "inherit" && fromRole.has(p.key));
                    return (
                      <li key={p.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {p.label}{" "}
                            <span className={cn("text-xs font-normal", effective ? "text-status-available" : "text-muted-foreground")}>
                              {effective ? "allowed" : "not allowed"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                        <div role="radiogroup" aria-label={p.label} className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted p-0.5">
                          {(["inherit", "grant", "deny"] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              role="radio"
                              aria-checked={s === opt}
                              disabled={busy === p.key}
                              onClick={() => s !== opt && change(p.key, opt)}
                              className={cn(
                                "rounded px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-60",
                                s === opt && "bg-card text-foreground shadow-sm",
                                s === opt && opt === "grant" && "text-status-available",
                                s === opt && opt === "deny" && "text-status-damaged",
                              )}
                            >
                              {opt === "inherit" ? `Role (${fromRole.has(p.key) ? "yes" : "no"})` : opt === "grant" ? "Allow" : "Deny"}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
