import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/jwt.types';

/**
 * JWT Service for token creation and validation
 * Handles both signing and verifying JWT tokens
 */
@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly secret: string;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly issuer?: string;
  private readonly audience?: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessSecret = this.validateAndGetSecret(
      'JWT_ACCESS_SECRET',
      'JWT_SECRET',
    );
    // Refresh secret is optional, fallback to access secret if not provided
    const refreshSecret = this.validateAndGetSecret('JWT_REFRESH_SECRET');
    this.refreshSecret = refreshSecret || this.accessSecret;
    this.secret = this.accessSecret; // Default secret for verification
    this.issuer = process.env.JWT_ISSUER;
    this.audience = process.env.JWT_AUDIENCE;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Create access token
   * @param payload - User data to encode in token
   * @returns JWT access token string
   */
  signAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
    jti?: string;
  }): string {
    const tokenPayload: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'access',
      jti: payload.jti,
    };

    const accessToken = jwt.sign(tokenPayload, this.accessSecret, {
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256',
    });

    return accessToken;
  }

  /**
   * Create refresh token
   * @param payload - User data to encode in token
   * @returns JWT refresh token string
   */
  signRefreshToken(payload: {
    sub: string;
    email: string;
    role: string;
    jti?: string;
  }): string {
    const tokenPayload: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: 'refresh',
      jti: payload.jti,
    };

    return jwt.sign(tokenPayload, this.refreshSecret, {
      issuer: this.issuer,
      audience: this.audience,
      algorithm: 'HS256',
    });
  }

  /**
   * Create both access and refresh tokens
   * @param payload - User data to encode in tokens
   * @returns Object containing access and refresh tokens
   */
  signTokens(payload: {
    sub: string;
    email: string;
    role: string;
    jti?: string;
  }): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
    };
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token string
   * @param tokenType - Type of token ('access' or 'refresh')
   * @returns Decoded JWT payload
   * @throws UnauthorizedException if token is invalid
   */
  verifyToken(
    token: string,
    tokenType: 'access' | 'refresh' = 'access',
  ): JwtPayload {
    try {
      // Use appropriate secret based on token type
      const secret =
        tokenType === 'refresh' ? this.refreshSecret : this.accessSecret;

      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256', 'HS384', 'HS512'],
        issuer: this.issuer,
        audience: this.audience,
      }) as jwt.JwtPayload;

      // Validate payload structure
      const payload = this.validatePayload(decoded);

      // Validate token type matches expected type
      if (payload.type && payload.type !== tokenType) {
        this.logger.warn(
          `Token type mismatch. Expected: ${tokenType}, Got: ${payload.type}`,
        );
        throw new UnauthorizedException('Invalid token type');
      }

      // Additional expiration check (jwt.verify already checks this, but we validate structure)
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        this.logger.warn(`Expired token for user: ${payload.sub}`);
        throw new UnauthorizedException('Token has expired');
      }

      // Log successful validation in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `JWT validated successfully for user: ${payload.sub} (${payload.email})`,
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        this.logger.warn('Token expired');
        throw new UnauthorizedException('Token has expired');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn(`Invalid token: ${error.message}`);
        throw new UnauthorizedException('Invalid token');
      }

      if (error instanceof jwt.NotBeforeError) {
        this.logger.warn('Token not active yet');
        throw new UnauthorizedException('Token not active');
      }

      this.logger.error(
        `Unexpected error during token verification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Decode token without verification (for inspection only)
   * @param token - JWT token string
   * @returns Decoded token payload (not verified)
   */
  decodeToken(token: string): JwtPayload | null {
    return jwt.decode(token, { complete: false }) as JwtPayload | null;
  }

  /**
   * Validate and get JWT secret from environment
   * @param primaryKey - Primary environment variable name
   * @param fallbackKey - Fallback environment variable name
   * @throws Error if secret is invalid or missing
   */
  private validateAndGetSecret(
    primaryKey: string,
    fallbackKey?: string,
  ): string {
    const jwtSecret =
      process.env[primaryKey] ||
      (fallbackKey ? process.env[fallbackKey] : undefined) ||
      process.env.JWT_SECRET_KEY;

    if (!jwtSecret) {
      if (primaryKey === 'JWT_REFRESH_SECRET') {
        // Refresh secret is optional, can fallback to access secret
        return '';
      }
      throw new Error(
        `JWT secret is required. Set ${primaryKey}${fallbackKey ? ` or ${fallbackKey}` : ''} in environment variables.`,
      );
    }

    if (jwtSecret.length < 32) {
      throw new Error(
        `JWT secret must be at least 32 characters long for security.`,
      );
    }

    if (jwtSecret === 'default-secret-key-change-in-production') {
      throw new Error(
        'Default JWT secret detected. Set a secure JWT secret in environment variables.',
      );
    }

    return jwtSecret;
  }

  /**
   * Validate JWT payload structure and return typed payload
   * @throws UnauthorizedException if payload is invalid
   */
  private validatePayload(decoded: jwt.JwtPayload): JwtPayload {
    if (!decoded) {
      throw new UnauthorizedException('Token payload is missing');
    }

    // Validate required fields
    if (
      !decoded.sub ||
      typeof decoded.sub !== 'string' ||
      decoded.sub.trim() === ''
    ) {
      throw new UnauthorizedException('Invalid user ID in token');
    }

    if (
      !decoded.email ||
      typeof decoded.email !== 'string' ||
      decoded.email.trim() === ''
    ) {
      throw new UnauthorizedException('Invalid email in token');
    }

    if (
      !decoded.role ||
      typeof decoded.role !== 'string' ||
      decoded.role.trim() === ''
    ) {
      throw new UnauthorizedException('Invalid role in token');
    }

    // Validate email format
    if (!this.isValidEmail(decoded.email)) {
      this.logger.warn(`Invalid email format in token: ${decoded.email}`);
      throw new UnauthorizedException('Invalid token payload');
    }

    // Validate role
    if (!this.isValidRole(decoded.role)) {
      this.logger.warn(`Invalid role in token: ${decoded.role}`);
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      type: decoded.type as 'access' | 'refresh' | undefined,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate role (basic validation - can be extended)
   */
  private isValidRole(role: string): boolean {
    const validRoles = ['user', 'admin', 'host', 'guest'];
    return validRoles.includes(role.toLowerCase());
  }
}
