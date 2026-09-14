"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http";

export default function PeopleEditor({ initialPeople }: { initialPeople: string[] }) {
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);
  const [draft, setDraft] = useState("");

  async function save(next: string[], previous: string[]) {
    const res = await fetch("/api/case/people", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ people: next }),
    });
    if (!res.ok) {
      setPeople(previous);
      toast.error(await apiErrorMessage(res, "No se pudo guardar quién busca."));
      return;
    }
    const data = await res.json();
    setPeople(data.case.people);
    router.refresh();
  }

  function add() {
    const name = draft.trim();
    setDraft("");
    if (!name || people.includes(name)) return;
    const previous = people;
    const next = [...people, name];
    setPeople(next);
    save(next, previous);
  }

  function remove(name: string) {
    const previous = people;
    const next = people.filter((p) => p !== name);
    setPeople(next);
    save(next, previous);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {people.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {p}
          <button type="button" onClick={() => remove(p)} aria-label={`Sacar a ${p}`} className="leading-none">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="+ Agregar persona"
        className="rounded-full border px-2.5 py-1 text-xs"
        style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)", width: "9.5rem" }}
      />
    </div>
  );
}
