"use client";

import { useState, useEffect } from "react";

const API = "http://localhost:3001";

interface Area {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  area: Area | null;
  createdAt: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    areaId: "",
  });

  useEffect(() => {
    fetchAreas();
    fetchProjects();
  }, []);

  async function fetchAreas() {
    try {
      const res = await fetch(`${API}/areas`);
      const data = await res.json();
      setAreas(data);
      if (data.length > 0) {
        setForm((f) => ({ ...f, areaId: String(data[0].id) }));
      }
    } catch {
      setError("No se pudo conectar al backend");
    }
  }

  async function fetchProjects() {
    const res = await fetch(`${API}/projects`);
    const data = await res.json();
    setProjects(data);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      name: form.name,
      description: form.description || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      areaId: parseInt(form.areaId),
    };

    try {
      const res = await fetch(`${API}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear proyecto");
      }

      setForm({ name: "", description: "", startDate: "", endDate: "", areaId: form.areaId });
      fetchProjects();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateArea(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API}/areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAreaName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al crear área");
      }

      setNewAreaName("");
      setShowAreaForm(false);
      fetchAreas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Proyectos</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <form onSubmit={handleCreateProject} className="mb-8 space-y-4 bg-white p-5 rounded-lg border">
        <h2 className="text-lg font-semibold">Crear Proyecto</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha inicio</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha fin</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Área *</label>
          {areas.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={form.areaId}
                onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                className="flex-1 border rounded px-3 py-2"
                required
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAreaForm(true)}
                className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                + Nueva
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No hay áreas. Crea una primero.</p>
              <button
                type="button"
                onClick={() => setShowAreaForm(true)}
                className="px-3 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Crear área
              </button>
            </div>
          )}
        </div>

        {showAreaForm && (
          <form onSubmit={handleCreateArea} className="flex gap-2 p-3 bg-gray-50 rounded">
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Nombre del área"
              className="flex-1 border rounded px-3 py-2"
              required
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Crear
            </button>
            <button type="button" onClick={() => setShowAreaForm(false)} className="px-3 py-2 text-gray-600">
              Cancelar
            </button>
          </form>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear Proyecto"}
        </button>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-4">Proyectos ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="text-gray-500">No hay proyectos creados</p>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{p.name}</h3>
                    {p.description && <p className="text-sm text-gray-600 mt-1">{p.description}</p>}
                  </div>
                  {p.area && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {p.area.name}
                    </span>
                  )}
                </div>
                {(p.startDate || p.endDate) && (
                  <p className="text-sm text-gray-500 mt-2">
                    {p.startDate && `Inicio: ${p.startDate}`}
                    {p.startDate && p.endDate && " | "}
                    {p.endDate && `Fin: ${p.endDate}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
