/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  type?: 'access' | 'refresh'; // Token type
  iat?: number; // Issued at
  exp?: number; // Expiration time
  jti?: string; // JWT ID (for token revocation)
}

/**
 * Request user interface after JWT validation
 * This is attached to request.user by AuthGuard
 */
export interface RequestUser {
  id: string;
  email: string;
  role: string;
}
