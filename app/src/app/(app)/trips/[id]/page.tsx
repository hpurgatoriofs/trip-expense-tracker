// Trip page (F2.AC8, F2.AC9, F2.AC10, F2.AC11, F2.AC16). The access gate (proxy.ts) keeps
// logged-out visitors off this page. Server component: it reads the trip id from the route and
// renders the client component, which fetches the trip. The route param is read inside Suspense,
// so the page can still be prerendered (Cache Components), the same as the login page.

import { Suspense } from "react";
import { TripPage } from "./trip-page";

type Params = Promise<{ id: string }>;

async function TripContent({ params }: { params: Params }) {
  const { id } = await params;
  return <TripPage tripId={id} />;
}

export default function TripRoutePage({ params }: { params: Params }) {
  return (
    <main>
      <Suspense fallback={null}>
        <TripContent params={params} />
      </Suspense>
    </main>
  );
}
