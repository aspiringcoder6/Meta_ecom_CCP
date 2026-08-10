import { randomBytes } from 'node:crypto'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import type { Response } from 'express'
import type { AccountRole } from './roles.js'
import { env } from '../config/env.js'

export const AUTH_COOKIE = 'meta_ecom_session'

export interface SessionPayload extends JwtPayload {
  sub: string
  role: AccountRole
  tokenVersion: number
  csrfToken: string
}

export function createSessionToken(user: { id: string; role: AccountRole; tokenVersion: number }, rememberMe = false) {
  const csrfToken = randomBytes(24).toString('base64url')
  const expiresIn = (rememberMe ? env.jwtRememberExpiresIn : env.jwtExpiresIn) as SignOptions['expiresIn']
  const token = jwt.sign(
    { role: user.role, tokenVersion: user.tokenVersion, csrfToken },
    env.jwtSecret,
    { subject: user.id, expiresIn, issuer: 'meta-ecom-api', audience: 'meta-ecom-web' },
  )
  return { token, csrfToken }
}

export function verifySessionToken(token: string) {
  return jwt.verify(token, env.jwtSecret, { issuer: 'meta-ecom-api', audience: 'meta-ecom-web' }) as SessionPayload
}

export function setSessionCookie(response: Response, token: string, rememberMe = false) {
  response.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  })
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
  })
}
