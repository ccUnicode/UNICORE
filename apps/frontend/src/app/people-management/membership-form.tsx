"use client";

import { FormEvent, useState } from "react";
import { authorizedJson } from "@/lib/auth-client";
import type { ManagedArea, ManagedAreaMembership } from "../people-management.types";
import { Feedback, fieldClass, labelClass, messageFrom, Modal, primaryButton, secondaryButton } from "./shared";

export function MembershipForm({
  membership,
  memberId,
  areas,
  accessToken,
  onClose,
  onSaved,
}: {
  membership?: ManagedAreaMembership;
  memberId: number;
  areas: ManagedArea[];
  accessToken: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [areaId, setAreaId] = useState(
    membership?.areaId ? String(membership.areaId) : "",
  );
  const [role, setRole] = useState(membership?.role ?? "miembro");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const activeAreas = areas.filter((area) => !area.isArchived);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await authorizedJson(
        membership?.id
          ? `/area-memberships/${membership.id}`
          : "/area-memberships",
        accessToken,
        {
          method: membership?.id ? "PATCH" : "POST",
          body: JSON.stringify({
            ...(!membership?.id ? { memberId } : {}),
            areaId: Number(areaId),
            role,
          }),
        },
      );
      await onSaved();
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={membership ? "Editar área y rol" : "Añadir área y rol"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <label className={labelClass}>
          Área
          <select
            required
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Selecciona un área</option>
            {activeAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Rol en el área
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={fieldClass}
          >
            <option value="miembro">Miembro</option>
            <option value="directiva_de_area">Directiva de área</option>
          </select>
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={saving || !areaId} className={primaryButton}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
