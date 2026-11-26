// Shell for every logged-in page. The access gate (proxy.ts) has already checked the session
// before this layout renders, so the layout only draws the header and the logout button.

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <Link href="/trips">Trip Expense Tracker</Link>
        <LogoutButton />
      </header>
      {children}
    </>
  );
}
