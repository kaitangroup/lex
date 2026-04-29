import { createContext, useContext, useState, ReactNode } from "react";
import type { Staff, StaffRole } from "@shared/schema";

// Display role for the dashboard system. Maps from Staff.role + special-case
// Margaret Chen as the managing partner (full access).
export type ViewRole = "managing_partner" | "lawyer" | "paralegal" | "bookkeeper";

export function viewRoleFor(staff: Staff | undefined): ViewRole {
  if (!staff) return "managing_partner";
  // Margaret Chen is the managing partner with full visibility
  if (staff.id === "s1") return "managing_partner";
  // Bookkeeper id reserved for the future seed; staff.role === "bookkeeper" if ever added
  if ((staff.role as string) === "bookkeeper") return "bookkeeper";
  if (staff.role === "paralegal") return "paralegal";
  return "lawyer"; // partners (non-managing) and associates
}

export function viewRoleLabel(role: ViewRole): string {
  switch (role) {
    case "managing_partner":
      return "Managing Partner";
    case "lawyer":
      return "Lawyer";
    case "paralegal":
      return "Paralegal";
    case "bookkeeper":
      return "Bookkeeper";
  }
}

interface CurrentUserCtx {
  staffId: string;
  role: ViewRole;
  setStaffId: (id: string) => void;
}

const Ctx = createContext<CurrentUserCtx | null>(null);

export function CurrentUserProvider({
  staff,
  children,
}: {
  staff: Staff[];
  children: ReactNode;
}) {
  // Default to Margaret Chen (managing partner) — gives full firm view
  const [staffId, setStaffId] = useState<string>("s1");
  const me = staff.find((s) => s.id === staffId);
  const role = viewRoleFor(me);
  return (
    <Ctx.Provider value={{ staffId, role, setStaffId }}>{children}</Ctx.Provider>
  );
}

export function useCurrentUser() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCurrentUser must be used within CurrentUserProvider");
  return c;
}
