import type { RequestHandler } from 'express'
import { clearSessionCookie, setSessionCookie } from '../../auth/token.js'
import * as service from './auth.service.js'
import { validateGoogleCredential, validateLogin, validateSignup } from './auth.validation.js'

export const signup: RequestHandler = async (request, response) => {
  const user = await service.signupLocal(validateSignup(request.body))
  response.status(201).json({ data: { user, pending: true } })
}

export const login: RequestHandler = async (request, response) => {
  const result = await service.loginLocal(validateLogin(request.body))
  setSessionCookie(response, result.token, result.rememberMe)
  response.json({ data: { user: result.user, csrfToken: result.csrfToken } })
}

export const google: RequestHandler = async (request, response) => {
  const result = await service.authenticateGoogle(validateGoogleCredential(request.body))
  if (result.pending) {
    response.status(202).json({ data: { user: result.user, pending: true } })
    return
  }
  setSessionCookie(response, result.token, result.rememberMe)
  response.json({ data: { user: result.user, csrfToken: result.csrfToken, pending: false } })
}

export const me: RequestHandler = async (request, response) => {
  const user = await service.getCurrentUser(request.auth!.user.id)
  response.json({ data: { user, csrfToken: request.auth!.csrfToken } })
}

export const logout: RequestHandler = async (_request, response) => {
  clearSessionCookie(response)
  response.status(204).send()
}
