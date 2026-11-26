// Trips list page (F2.AC6, F2.AC7, F2.AC15, F2.R6, F2.R7). The access gate (proxy.ts) keeps
// logged-out visitors off this page. The list itself is fetched by the client component.

import { TripsList } from "./trips-list";

export default function TripsPage() {
  return (
    <main>
      <h1>Trips</h1>
      <TripsList />
    </main>
  );
}
