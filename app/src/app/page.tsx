// Root page (F1 flow): sends every visit to /trips. The access gate (proxy.ts) then sends a
// logged-out visitor on to the login page.

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/trips");
}
