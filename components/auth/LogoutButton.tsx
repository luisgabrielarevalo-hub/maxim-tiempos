"use client";

import { useFormStatus } from "react-dom";

import { logoutAction } from "@/app/actions/auth";

function LogoutSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-primary-foreground/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors hover:bg-primary-foreground/10 focus-visible:ring-[3px] focus-visible:ring-primary-foreground/40 focus-visible:outline-none disabled:opacity-60"
    >
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <LogoutSubmit />
    </form>
  );
}
