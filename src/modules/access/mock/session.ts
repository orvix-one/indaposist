/* Sesión de ejemplo hasta que exista autenticación (IND-01.01). Mientras se valida la matriz de permisos (D05), un único usuario de Administración puede hacer todo (IND-01.03). */

export const currentUser = {
  name: "Lucía Méndez",
  role: "Administración",
  canRegisterPhotocopy: true,
  canDecideTickets: true,
  canRegisterPayments: true,
};
