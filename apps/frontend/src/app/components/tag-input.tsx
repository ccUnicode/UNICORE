"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import {
  canonicalizeTags,
  cleanTag,
  matchingTagSuggestions,
  normalizeTag,
  validateTag,
} from "../tag-utils";

export function TagInput({
  label,
  value,
  suggestions,
  onChange,
  required = false,
}: {
  label: string;
  value: string[];
  suggestions: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const fieldId = normalizeTag(label).replace(/\s+/g, "-");
  const labelId = `${fieldId}-label`;
  const errorId = `${fieldId}-error`;
  const matches = useMemo(
    () =>
      matchingTagSuggestions(
        draft,
        suggestions,
        value.filter((_, index) => index !== editingIndex),
      ),
    [draft, editingIndex, suggestions, value],
  );

  const commitMany = (candidates: string[]) => {
    const cleanedCandidates = candidates.map(cleanTag).filter(Boolean);
    const candidateError = cleanedCandidates.length
      ? cleanedCandidates.map(validateTag).find(Boolean)
      : validateTag("");
    if (candidateError) {
      setError(candidateError);
      return;
    }
    const base = value.filter((_, index) => index !== editingIndex);
    const next = canonicalizeTags([...base, ...cleanedCandidates], suggestions);
    if (next.length === base.length) {
      setError("Esta etiqueta ya fue agregada.");
      return;
    }
    onChange(next);
    setDraft("");
    setEditingIndex(null);
    setError("");
  };
  const commit = (candidate: string) => commitMany([candidate]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    }
    if (event.key === "Escape" && editingIndex !== null) {
      setDraft("");
      setEditingIndex(null);
      setError("");
    }
  };

  return (
    <div
      className="relative"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <span id={labelId} className="block text-sm font-medium text-white/75">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <div
        className={`mt-2 flex min-h-11 flex-wrap items-center gap-2 rounded-md border bg-[#20212c] px-3 py-2 focus-within:ring-2 ${
          error
            ? "border-rose-400/70 focus-within:ring-rose-400/30"
            : "border-white/10 focus-within:ring-[#7478ff]/40"
        }`}
      >
          {value.map((tag, index) => (
            <span
              key={`${normalizeTag(tag)}-${index}`}
              className="inline-flex items-center rounded bg-[#6777bb] text-xs text-white"
            >
              <button
                type="button"
                className="px-2 py-1.5 hover:bg-white/10"
                aria-label={`Editar ${tag}`}
                onClick={() => {
                  setDraft(tag);
                  setEditingIndex(index);
                  setError("");
                }}
              >
                {tag}
              </button>
              <button
                type="button"
                className="border-l border-white/15 px-2 py-1.5 hover:bg-white/10"
                aria-label={`Quitar ${tag}`}
                onClick={() => {
                  onChange(value.filter((_, itemIndex) => itemIndex !== index));
                  if (editingIndex === index) {
                    setDraft("");
                    setEditingIndex(null);
                  }
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            value={draft}
            aria-labelledby={labelId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            placeholder={value.length ? "Agregar otra…" : "Escribe o selecciona…"}
            className="min-w-40 flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/30"
            onChange={(event) => {
              const nextDraft = event.target.value;
              setError("");
              if (nextDraft.includes(",")) {
                const entries = nextDraft.split(",");
                commitMany(entries.slice(0, -1));
                setDraft(entries.at(-1) ?? "");
              } else {
                setDraft(nextDraft);
              }
            }}
            onKeyDown={handleKeyDown}
          />
      </div>
      {focused && matches.length > 0 && (
        <div className="absolute z-30 mt-1 grid max-h-52 w-full overflow-y-auto rounded-md border border-white/10 bg-[#191822] p-1 shadow-2xl">
          {matches.map((suggestion) => (
            <button
              key={normalizeTag(suggestion)}
              type="button"
              className="rounded px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commit(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-2 text-xs text-rose-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
