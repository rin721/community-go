import type {
  CommunityAuthSession,
  CommunitySignupRequest,
  LoginRequest,
  CommunitySignupResult
} from "../types/api"

export const mockCommunityAuthCookieName = "aoi_mock_community_session"

type MockCommunityAccount = {
  createdAt: string
  displayName: string
  email: string
  id: string
  password: string
  username: string
}

const mockCommunityAccountsByEmail = new Map<string, MockCommunityAccount>()
const mockCommunityAccountsById = new Map<string, MockCommunityAccount>()
const mockCommunityAccountsByUsername = new Map<string, MockCommunityAccount>()
const mockCommunitySessions = new Map<string, CommunityAuthSession>()

seedMockCommunityAccount({
  displayName: "Rin721",
  email: "rin721@example.com",
  password: "password123",
  username: "rin721"
})

export function createMockCommunitySignup(body: CommunitySignupRequest): CommunitySignupResult | null {
  const username = normalizeToken(body.username)
  const email = normalizeEmail(body.email)
  const password = normalizePassword(body.password)
  const displayName = normalizeDisplayName(body.displayName, username)

  if (!username || !email || !password || !displayName) {
    return null
  }

  const existingAccount = mockCommunityAccountsByUsername.get(username) || mockCommunityAccountsByEmail.get(email)

  if (existingAccount && existingAccount.password !== password) {
    return null
  }

  const account = existingAccount || registerMockCommunityAccount({
    displayName,
    email,
    password,
    username
  })

  return {
    session: issueMockCommunitySession(account),
    status: "authenticated"
  }
}

export function createMockCommunityLogin(body: LoginRequest): CommunityAuthSession | null {
  const identifier = normalizeToken(body.identifier)
  const password = normalizePassword(body.password)
  const account = mockCommunityAccountsByUsername.get(identifier) || mockCommunityAccountsByEmail.get(identifier)

  if (!account || !password || account.password !== password) {
    return null
  }

  return issueMockCommunitySession(account)
}

export function getMockCommunitySession(sessionId: string): CommunityAuthSession | null {
  const session = mockCommunitySessions.get(sessionId)

  if (!session) {
    return null
  }

  if (Date.parse(session.refreshExpiresAt) <= Date.now()) {
    mockCommunitySessions.delete(sessionId)
    return null
  }

  return session
}

export function clearMockCommunitySession(sessionId: string) {
  mockCommunitySessions.delete(sessionId)
}

export function getMockCommunityAccountForSession(sessionId: string) {
  const session = getMockCommunitySession(sessionId)

  if (!session) {
    return null
  }

  const account = mockCommunityAccountsById.get(session.userId)

  if (!account) {
    return null
  }

  return {
    authorName: account.displayName,
    clientId: `account:${account.id}`
  }
}

function seedMockCommunityAccount(input: Omit<MockCommunityAccount, "createdAt" | "id">) {
  registerMockCommunityAccount(input)
}

function registerMockCommunityAccount(input: Omit<MockCommunityAccount, "createdAt" | "id">): MockCommunityAccount {
  const now = Date.now()
  const account: MockCommunityAccount = {
    ...input,
    createdAt: new Date(now).toISOString(),
    id: `mock-user-${input.username}-${now.toString(36)}`
  }

  mockCommunityAccountsByUsername.set(account.username, account)
  mockCommunityAccountsByEmail.set(account.email, account)
  mockCommunityAccountsById.set(account.id, account)

  return account
}

function issueMockCommunitySession(account: MockCommunityAccount): CommunityAuthSession {
  const now = Date.now()
  const session: CommunityAuthSession = {
    account: {
      displayName: account.displayName,
      handle: account.username,
      id: account.id
    },
    accessExpiresAt: new Date(now + 1000 * 60 * 60).toISOString(),
    refreshExpiresAt: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
    sessionId: `mock-session-${account.id}-${now.toString(36)}`,
    userId: account.id
  }

  mockCommunitySessions.set(session.sessionId, session)

  return session
}

function normalizeDisplayName(value: string | undefined, fallback: string) {
  const normalized = String(value || "").trim()

  return normalized || fallback
}

function normalizeEmail(value: string) {
  const email = String(value || "").trim().toLowerCase()

  return email.includes("@") ? email : ""
}

function normalizePassword(value: string) {
  const password = String(value || "")

  return password.length >= 6 ? password : ""
}

function normalizeToken(value: string) {
  return String(value || "").trim().toLowerCase()
}
