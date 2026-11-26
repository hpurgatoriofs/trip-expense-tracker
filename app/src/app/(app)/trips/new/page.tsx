// Create trip page (F2 flow step 2, F2.AC1 to F2.AC4). The access gate (proxy.ts) keeps
// logged-out visitors off this page. Server component: it renders the client form.

import { CreateTripForm } from "./create-trip-form";

export default function NewTripPage() {
  return (
    <main>
      <h1>New trip</h1>
      <CreateTripForm />
    </main>
  );
}
