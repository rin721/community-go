import { create } from "zustand";

import type {
  CurrentUser,
  Organization,
  SessionPermissionGrant,
  SessionSnapshot,
} from "~/lib/api/types";

type AuthState = {
  accessExpiresAt: string;
  clearSession: () => void;
  clientType: string;
  currentOrgId: string | null;
  currentSessionId: string | null;
  hydrateFromStorage: () => void;
  hydrated: boolean;
  isAuthenticated: boolean;
  orgs: Organization[];
  permissions: SessionPermissionGrant[];
  productCode: string;
  refreshExpiresAt: string;
  setIdentity: (user: CurrentUser | null, orgs: Organization[]) => void;
  setSession: (session: SessionSnapshot | null) => void;
  user: CurrentUser | null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessExpiresAt: "",
  clearSession: () => {
    set({
      accessExpiresAt: "",
      clientType: "",
      currentOrgId: null,
      currentSessionId: null,
      isAuthenticated: false,
      orgs: [],
      permissions: [],
      productCode: "",
      refreshExpiresAt: "",
      user: null,
    });
  },
  clientType: "",
  currentOrgId: null,
  currentSessionId: null,
  hydrateFromStorage: () => {
    set({ hydrated: true });
  },
  hydrated: false,
  isAuthenticated: false,
  orgs: [],
  permissions: [],
  productCode: "",
  refreshExpiresAt: "",
  setIdentity: (user, orgs) => {
    set({
      currentOrgId: get().currentOrgId || String(orgs[0]?.id ?? "") || null,
      isAuthenticated: Boolean(get().currentSessionId && user),
      orgs,
      user,
    });
  },
  setSession: (session) => {
    if (!session) {
      get().clearSession();
      return;
    }
    set({
      accessExpiresAt: session.accessExpiresAt ?? "",
      clientType: session.clientType,
      currentOrgId: stringID(session.orgId),
      currentSessionId: stringID(session.sessionId),
      isAuthenticated: Boolean(session.sessionId),
      permissions: session.permissions ?? [],
      productCode: session.productCode,
      refreshExpiresAt: session.refreshExpiresAt ?? "",
    });
  },
  user: null,
}));

export function hasSessionPermission(
  grants: SessionPermissionGrant[],
  requirement: { code: string; productCode?: string; scope?: string },
) {
  const requiredCode = requirement.code.trim();
  const requiredScope = requirement.scope?.trim();
  const requiredProduct = requirement.productCode?.trim();
  if (!requiredCode) {
    return false;
  }
  return grants.some((grant) => {
    if (requiredProduct && grant.productCode !== requiredProduct) {
      return false;
    }
    if (requiredScope && grant.scope !== requiredScope) {
      return false;
    }
    return permissionCodeAllows(grant.code, requiredCode);
  });
}

function permissionCodeAllows(grantCode: string, requiredCode: string) {
  if (grantCode === requiredCode) {
    return true;
  }
  const [grantObject, grantAction] = splitPermissionCode(grantCode);
  const [requiredObject, requiredAction] = splitPermissionCode(requiredCode);
  if (!grantObject || !grantAction || !requiredObject || !requiredAction) {
    return false;
  }
  return (
    (grantObject === "*" || grantObject === requiredObject) &&
    (grantAction === "*" || grantAction === requiredAction)
  );
}

function splitPermissionCode(code: string) {
  const parts = code.trim().split(":", 2);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return ["", ""];
  }
  return parts;
}

function stringID(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}
