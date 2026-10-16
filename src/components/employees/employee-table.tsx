"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/components/layout/locale-provider";
import { ArrowUpDown, MoreHorizontal, Plus, Search, UserX } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EmployeeFormDialog, type EmployeeFormValues } from "./employee-form-dialog";
import { deactivateEmployee } from "@/actions/employee";
import { initials } from "@/lib/utils";

export interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  employmentType: string;
  status: string;
  role: "ADMIN" | "EMPLOYEE";
  hireDate: string;
  weeklyHours: number;
  vacationAllowance: number;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "muted"> = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  SUSPENDED: "danger",
  TERMINATED: "muted",
};

export function EmployeeTable({ data }: { data: EmployeeRow[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "firstName", desc: false }]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeFormValues | undefined>(undefined);

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            Name <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials(row.original.firstName, row.original.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium leading-tight">
                {row.original.firstName} {row.original.lastName}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      { accessorKey: "position", header: "Position" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ getValue }) => (
          <Badge variant={getValue<string>() === "ADMIN" ? "warning" : "default"}>
            {getValue<string>() === "ADMIN" ? "Boss" : "Employee"}
          </Badge>
        ),
      },
      {
        accessorKey: "employmentType",
        header: "Type",
        cell: ({ getValue }) => (
          <span className="capitalize">{(getValue<string>() ?? "").toLowerCase().replace("_", " ")}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<string>();
          return (
            <Badge variant={STATUS_VARIANT[status] ?? "muted"} className="capitalize">
              {status.toLowerCase().replace("_", " ")}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditing({
                    id: row.original.id,
                    firstName: row.original.firstName,
                    lastName: row.original.lastName,
                    email: row.original.email,
                    phone: row.original.phone ?? "",
                    position: row.original.position,
                    role: row.original.role,
                    employmentType: row.original.employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
                    hireDate: new Date(row.original.hireDate),
                    weeklyHours: row.original.weeklyHours,
                    vacationAllowance: row.original.vacationAllowance,
                    status: row.original.status as "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED",
                  });
                  setDialogOpen(true);
                }}
              >
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-danger"
                onClick={async () => {
                  const result = await deactivateEmployee(row.original.id);
                  if (result.success) {
                    toast.success(result.message);
                    router.refresh();
                  } else {
                    toast.error(result.error);
                  }
                }}
              >
                <UserX className="h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("ph.searchTeam")}
            className="pl-9"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add teammate
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">No teammates yet</p>
          <p className="text-sm text-muted-foreground">Add your first team member to get started.</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <EmployeeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultValues={editing} />
    </div>
  );
}
