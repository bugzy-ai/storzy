const VALID_USERNAME = "test_user"
const VALID_PASSWORD = "password"

export interface LoginCredentials {
  username: string
  password: string
}

export type LoginValidation =
  | { ok: true; credentials: LoginCredentials }
  | { ok: false }

export function validateLoginRequest(value: unknown): LoginValidation {
  if (
    typeof value !== "object" || value === null ||
    Object.keys(value).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(value, "username") ||
    !Object.prototype.hasOwnProperty.call(value, "password")
  ) {
    return { ok: false }
  }

  const { username, password } = value as { username?: unknown; password?: unknown }
  if (
    typeof username !== "string" || !username || username.length > 100 ||
    typeof password !== "string" || !password || password.length > 100
  ) {
    return { ok: false }
  }

  return { ok: true, credentials: { username, password } }
}

export function authenticate(credentials: LoginCredentials) {
  return credentials.username === VALID_USERNAME && credentials.password === VALID_PASSWORD
}
