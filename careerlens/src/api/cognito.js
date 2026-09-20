// Cognito Hosted UI login — Authorization Code + PKCE. Replaces the mock password form when
// VITE_USE_MOCK=false. No new dependencies: PKCE uses the browser's native crypto.subtle, same
// as everywhere else in this SPA.
//
// Flow: redirectToLogin()/redirectToSignUp() sends the browser to the Hosted UI. It comes back
// to REDIRECT_URI with ?code=&state=; handleRedirectCallback() (called once on app boot, see
// AppContext.jsx) exchanges the code for tokens, stores them, and strips the query string.
// getValidIdToken() is wired into src/api/http.js's setTokenProvider so every real API call
// attaches a fresh Bearer token, refreshing silently via the stored refresh token.

const DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID
const REGION = (import.meta.env.VITE_COGNITO_USER_POOL_ID || '').split('_')[0]
const REDIRECT_URI = `${window.location.origin}${window.location.pathname}`
const TOKENS_KEY = 'careerlens_cognito_tokens'
const PKCE_KEY = 'careerlens_cognito_pkce' // sessionStorage only — gone if the tab closes mid-login

function base64url(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(len = 64) {
  return base64url(crypto.getRandomValues(new Uint8Array(len))).slice(0, len)
}

async function sha256Base64Url(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return base64url(new Uint8Array(digest))
}

async function beginAuth(hostedUiPath, loginHint) {
  const verifier = randomString(64)
  const state = randomString(32)
  const challenge = await sha256Base64Url(verifier)
  sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  if (loginHint) params.set('login_hint', loginHint)
  window.location.href = `${DOMAIN}/${hostedUiPath}?${params.toString()}`
}

// loginHint pre-fills the Hosted UI's username field — kept for the real "Sign in" button.
export const redirectToLogin = (loginHint) => beginAuth('login', loginHint)
export const redirectToSignUp = () => beginAuth('signup')

// One-click judge/demo sign-in: calls Cognito's public, unauthenticated InitiateAuth action
// directly (USER_PASSWORD_AUTH flow, enabled only for these two pre-provisioned accounts — see
// careerlens-backend/lib/auth-stack.ts). No redirect, no Hosted UI page, so evaluators never see
// a "sign up" option. Requires no AWS credentials: InitiateAuth is a public API for app clients.
export async function demoLogin(email, password) {
  const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.AuthenticationResult) throw new Error(data.message || 'Demo sign-in failed')
  const r = data.AuthenticationResult
  const tokens = saveTokens({ id_token: r.IdToken, access_token: r.AccessToken, refresh_token: r.RefreshToken, expires_in: r.ExpiresIn })
  return decodeIdToken(tokens.idToken)
}

function decodeIdToken(idToken) {
  const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  const groups = payload['cognito:groups'] || []
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.email?.split('@')[0] || 'User',
    // Auth group only tells us student vs company (see docs/api-contract.md); fresher/experienced
    // is a profile field, not an auth concept, so it isn't set here.
    role: groups.includes('company') ? 'company' : 'student',
  }
}

function saveTokens({ id_token, access_token, refresh_token, expires_in }) {
  const tokens = {
    idToken: id_token,
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
  }
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
  return tokens
}

function loadTokens() {
  try { return JSON.parse(localStorage.getItem(TOKENS_KEY)) } catch { return null }
}

async function tokenRequest(body) {
  const res = await fetch(`${DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  if (!res.ok) return null
  return res.json()
}

// Call once on app boot (see AppContext.jsx). Returns the decoded user if this load is an OAuth
// redirect coming back from the Hosted UI, or null if it's a normal page load.
export async function handleRedirectCallback() {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  if (!code && !errorParam) return null

  const description = url.searchParams.get('error_description')
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)

  if (errorParam) throw new Error(description || errorParam)

  const stored = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null')
  sessionStorage.removeItem(PKCE_KEY)
  if (!stored || stored.state !== state) throw new Error('Sign-in state mismatch — please try signing in again')

  const tokenResponse = await tokenRequest({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: stored.verifier,
  })
  if (!tokenResponse) throw new Error('Sign-in failed — could not exchange the authorization code')

  const tokens = saveTokens(tokenResponse)
  return decodeIdToken(tokens.idToken)
}

// Wired into src/api/http.js via setTokenProvider.
export async function getValidIdToken() {
  let tokens = loadTokens()
  if (!tokens) return null
  if (Date.now() < tokens.expiresAt - 30_000) return tokens.idToken

  if (!tokens.refreshToken) { localStorage.removeItem(TOKENS_KEY); return null }
  const refreshed = await tokenRequest({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: tokens.refreshToken,
  })
  if (!refreshed) { localStorage.removeItem(TOKENS_KEY); return null }

  tokens = saveTokens({ ...refreshed, refresh_token: refreshed.refresh_token || tokens.refreshToken })
  return tokens.idToken
}

// Synchronous — used for AuthProvider's initial state so a page refresh doesn't flash the login screen.
export function currentUser() {
  const tokens = loadTokens()
  if (!tokens) return null
  try { return decodeIdToken(tokens.idToken) } catch { return null }
}

export function logout() {
  localStorage.removeItem(TOKENS_KEY)
  const params = new URLSearchParams({ client_id: CLIENT_ID, logout_uri: REDIRECT_URI })
  window.location.href = `${DOMAIN}/logout?${params.toString()}`
}
