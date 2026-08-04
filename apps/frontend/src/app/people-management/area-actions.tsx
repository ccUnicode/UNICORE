"use client";

import { FormEvent, useState } from "react";
import { authorizedJson } from "@/lib/auth-client";
import type { ManagedArea } from "../people-management.types";
import { dangerButton, Feedback, fieldClass, labelClass, messageFrom, Modal, primaryButton, secondaryButton } from "./shared";

export function AreaForm({
  area,
  accessToken,
  onClose,
  onSaved,
}: {
  area?: ManagedArea;
  accessToken: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(area?.name ?? "");
  const [description, setDescription] = useState(area?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authorizedJson(area ? `/areas/${area.id}` : "/areas", accessToken, {
        method: area ? "PATCH" : "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });
      await onSaved();
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={area ? "Editar área" : "Añadir área"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <label className={labelClass}>
          Nombre
          <input
            required
            maxLength={150}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className={`${fieldClass} h-auto py-3`}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={saving || !name.trim()} className={primaryButton}>
            {saving ? "Guardando..." : "Guardar área"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ExactNameAction({
  title,
  name,
  description,
  actionLabel,
  accessToken,
  path,
  onClose,
  onDone,
}: {
  title: string;
  name: string;
  description: string;
  actionLabel: string;
  accessToken: string;
  path: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authorizedJson(path, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ confirmName: confirmation }),
      });
      await onDone();
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <p className="text-sm leading-6 text-white/65">{description}</p>
        <label className={labelClass}>
          Escribe <strong className="text-white">{name}</strong> para confirmar
          <input
            autoFocus
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={fieldClass}
          />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={dangerButton}
            disabled={saving || confirmation !== name}
          >
            {saving ? "Procesando..." : actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

