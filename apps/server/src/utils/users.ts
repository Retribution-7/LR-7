export interface PublicUser {
  id: number;
  username: string;
  role: string;
}

export function toPublicUser(u: { id: number; username: string; role: { name: string } }): PublicUser {
  return { id: u.id, username: u.username, role: u.role.name };
}
