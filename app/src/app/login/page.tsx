// Log in page (F1 flow step 2 and 3, F1.AC5, F1.AC6, F1.AC9). Server component: it reads the
// query and renders the client form. `next` is passed on; the server checks it (F1.AC10).

import { Suspense } from "react";
import Link from "next/link";
import { loggedOutNotice } from "@/domain/auth-messages";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Reads the query inside Suspense, so the page can still be prerendered (Cache Components).
async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = firstValue(params.next);
  const loggedOut = firstValue(params.loggedOut) === "1";

  return (
    <>
      {loggedOut ? <p role="status">{loggedOutNotice()}</p> : null}
      <LoginForm next={next} />
    </>
  );
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main>
      <h1>Log in</h1>
      <Suspense fallback={null}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
      <p>
        No account yet? <Link href="/register">Register</Link>
      </p>
    </main>
  );
}
