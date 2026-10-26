"use client";

export function PeoplePicker({
  people,
  value,
  onChange,
  lockedIds = [],
}: {
  people: { id: string; label: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  lockedIds?: string[];
}) {
  const selected = new Set([...lockedIds, ...(value ?? [])]);

  function toggle(id: string) {
    if (lockedIds.includes(id)) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    for (const locked of lockedIds) next.add(locked);
    onChange(Array.from(next));
  }

  return (
    <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-border p-2">
      {people.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">No people yet.</p>
      ) : (
        people.map((person) => (
          <label
            key={person.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-hover"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#00425a]"
              checked={selected.has(person.id)}
              disabled={lockedIds.includes(person.id)}
              onChange={() => toggle(person.id)}
            />
            <span>{person.label}</span>
          </label>
        ))
      )}
    </div>
  );
}
