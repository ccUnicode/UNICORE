export enum MemberAvailabilityStatus {
  /** Disponible: puede ser asignado a equipos. */
  AVAILABLE = 'available',

  /** No disponible: no puede ser asignado temporalmente. */
  UNAVAILABLE = 'unavailable',

  // TODO(auth): cuando exista un módulo de autenticación, usar este valor
  // para bloquear el acceso al sistema del miembro mientras se preservan
  // sus datos e historial.
  /** Inhabilitado: acceso al sistema bloqueado; datos e historial intactos. */
  DISABLED = 'disabled',
}
