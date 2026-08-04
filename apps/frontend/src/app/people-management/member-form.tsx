"use client";

import { FormEvent, useState } from "react";
import { authorizedJson } from "@/lib/auth-client";
import type { ManagedArea, ManagedMember } from "../people-management.types";
import { Feedback, fieldClass, labelClass, messageFrom, Modal, primaryButton, secondaryButton } from "./shared";

type MemberFormState = {
  institution: string;
  studentCode: string;
  firstNames: string;
  lastNames: string;
  major: string;
  birthDate: string;
  role: string;
  areaId: string;
  skills: string;
  activityStatus: string;
  availabilityStatus: string;
  cycle: string;
};

export function MemberForm({
  member,
  areas,
  accessToken,
  onClose,
  onSaved,
}: {
  member?: ManagedMember;
  areas: ManagedArea[];
  accessToken: string;
  onClose: () => void;
  onSaved: (memberId: number) => Promise<void>;
}) {
  const initial: MemberFormState = {
    institution: member?.institution ?? "UNI",
    studentCode: member?.studentCode ?? "",
    firstNames: member?.firstNames ?? "",
    lastNames: member?.lastNames ?? "",
    major: member?.major ?? "",
    birthDate: member?.birthDate?.slice(0, 10) ?? "",
    role: member?.role ?? "miembro",
    areaId: member?.areaId ? String(member.areaId) : "",
    skills: member?.skills?.map((skill) => skill.name).join(", ") ?? "",
    activityStatus: member?.activityStatus ?? "active",
    availabilityStatus: member?.availabilityStatus ?? "available",
    cycle: member?.cycle ? String(member.cycle) : "",
  };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const activeAreas = areas.filter((area) => !area.isArchived);
  const set = (key: keyof MemberFormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const skills = form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const payload = {
        institution: form.institution.trim(),
        studentCode: form.studentCode.trim() || (member ? null : undefined),
        firstNames: form.firstNames.trim(),
        lastNames: form.lastNames.trim(),
        major: form.major.trim(),
        birthDate: form.birthDate || undefined,
        skills,
        activityStatus: form.activityStatus,
        availabilityStatus: form.availabilityStatus,
        cycle: form.cycle ? Number(form.cycle) : member ? null : undefined,
        ...(!member
          ? {
              role: form.role,
              ...(form.role !== "presidencia" && form.areaId
                ? { areaId: Number(form.areaId) }
                : {}),
            }
          : {}),
      };
      const saved = await authorizedJson<ManagedMember>(
        member ? `/members/${member.id}` : "/members",
        accessToken,
        { method: member ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      await onSaved(saved.id);
    } catch (currentError) {
      setError(messageFrom(currentError));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={member ? "Editar miembro" : "Añadir miembro"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-5">
        {error && <Feedback>{error}</Feedback>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Nombres"
            required
            value={form.firstNames}
            onChange={(value) => set("firstNames", value)}
          />
          <FormInput
            label="Apellidos"
            required
            value={form.lastNames}
            onChange={(value) => set("lastNames", value)}
          />
          <FormInput
            label="Institución"
            required
            value={form.institution}
            onChange={(value) => set("institution", value)}
          />
          <FormInput
            label="Código de estudiante"
            required={
              !member && form.institution.trim().toUpperCase() === "UNI"
            }
            value={form.studentCode}
            onChange={(value) => set("studentCode", value)}
          />
          <FormInput
            label="Carrera"
            required
            value={form.major}
            onChange={(value) => set("major", value)}
          />
          <FormInput
            label="Fecha de nacimiento"
            required={!member}
            type="date"
            value={form.birthDate}
            onChange={(value) => set("birthDate", value)}
          />
          {!member && (
            <>
              <label className={labelClass}>
                Rol
                <select
                  value={form.role}
                  onChange={(event) => set("role", event.target.value)}
                  className={fieldClass}
                >
                  <option value="miembro">Miembro</option>
                  <option value="directiva_de_area">Directiva de área</option>
                  <option value="presidencia">Presidencia</option>
                </select>
              </label>
              <label className={labelClass}>
                Área
                <select
                  required={form.role === "directiva_de_area"}
                  value={form.areaId}
                  disabled={form.role === "presidencia"}
                  onChange={(event) => set("areaId", event.target.value)}
                  className={fieldClass}
                >
                  <option value="">Sin área</option>
                  {activeAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <FormInput
            label="Ciclo"
            type="number"
            min="1"
            max="12"
            value={form.cycle}
            onChange={(value) => set("cycle", value)}
          />
          <label className={labelClass}>
            Actividad
            <select
              value={form.activityStatus}
              onChange={(event) => set("activityStatus", event.target.value)}
              className={fieldClass}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label className={labelClass}>
            Disponibilidad
            <select
              value={form.availabilityStatus}
              onChange={(event) =>
                set("availabilityStatus", event.target.value)
              }
              className={fieldClass}
            >
              <option value="available">Disponible</option>
              <option value="not_available">No disponible</option>
              <option value="disabled">Inhabilitado</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <FormInput
              label="Skills separadas por comas"
              required
              value={form.skills}
              onChange={(value) => set("skills", value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={saving} className={primaryButton}>
            {saving ? "Guardando..." : "Guardar miembro"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FormInput({
  label,
  value,
  onChange,
  required,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input
        required={required}
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </label>
  );
}
