// Register page (F1 flow step 1, F1.AC1 to F1.AC4). Server component: it renders the client form.

import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main>
      <h1>Create an account</h1>
      <RegisterForm />
      <p>
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
