<script setup lang="ts">
import type { AccountProfileResponse } from "~/types/api"
import type { AoiSegmentedItem } from "~/components/aoi/AoiSegmentedControl.vue"

const api = useAoiApi()
const authSession = useAuthSessionStore()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const authenticated = computed(() => authSession.authenticated)

watchEffect(() => {
  if (authSession.hydrated && !authenticated.value) {
    router.replace("/login")
  }
})

useHead({ title: `${t("me.headTitle")} - Aoi` })

const profile = ref<AccountProfileResponse | null>(null)
const profileError = ref<string | null>(null)
const profilePending = ref(false)

async function loadProfile() {
  if (!authenticated.value) return
  profilePending.value = true
  profileError.value = null
  try {
    profile.value = await api.getAccountProfile()
    authSession.profileAvatarUrl = profile.value.avatarUrl || ""
  } catch {
    profileError.value = t("me.loadError")
  } finally {
    profilePending.value = false
  }
}

watch(authenticated, (val) => {
  if (val) void loadProfile()
}, { immediate: true })

// Expose profile state to sub-routes
provide("meProfile", {
  profile,
  profilePending,
  profileError,
  loadProfile
})

// Segmented control active tab matches the sub-route path
const activeTab = computed({
  get: () => {
    const segments = route.path.split("/me/")
    return (segments[1] || "profile") as any
  },
  set: (val) => {
    navigateTo(`/me/${val}`)
  }
})

const loggingOut = ref(false)
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authSession.logout()
    router.replace("/")
  } finally {
    loggingOut.value = false
  }
}

function roleLabel(role: string) {
  return role === "creator" ? t("me.roleCreator") : t("me.roleRegistered")
}

const tabItems = computed<AoiSegmentedItem[]>(() => [
  { value: "profile", label: t("me.tabs.profile"), icon: "circle-user-round" },
  { value: "following", label: t("me.tabs.following"), icon: "users" },
  { value: "collections", label: t("me.tabs.collections"), icon: "star" },
  { value: "history", label: t("me.tabs.history"), icon: "clock-3" },
  { value: "submissions", label: t("me.tabs.submissions"), icon: "upload" },
  { value: "security", label: t("me.tabs.security"), icon: "shield-alert" },
  { value: "sessions", label: t("me.tabs.sessions"), icon: "smartphone" }
])

// Watch route path changes to automatically redirect base route /me to /me/profile
watch([() => route.path, () => authSession.hydrated], () => {
  if (!authSession.hydrated) return
  if (route.path === "/me" || route.path === "/me/") {
    navigateTo("/me/profile", { replace: true })
  }
}, { immediate: true })
</script>

<template>
  <div class="aoi-page me-page-container">
    <AoiReveal
      v-if="!authSession.hydrated || profilePending"
      variant="pop"
      duration="400"
    >
      <div class="me-skeleton-root">
        <!-- Skeleton Hero Header -->
        <div class="me-hero-header me-skeleton-hero">
          <div class="me-hero-banner" style="position: relative; overflow: hidden; background: var(--aoi-border);">
            <AoiSkeleton width="100%" height="100%" />
          </div>
          <div class="me-hero-body" style="align-items: center; justify-content: flex-start; gap: 20px; padding: 0 var(--aoi-panel-padding) var(--aoi-panel-padding);">
            <div class="me-hero-avatar-wrapper" style="overflow: hidden; margin-top: -48px;">
              <AoiSkeleton width="100%" height="100%" radius="50%" />
            </div>
            <div class="me-hero-details" style="display: flex; flex-direction: column; gap: 8px; justify-content: center; height: 48px; flex: 1;">
              <AoiSkeleton width="180px" height="24px" radius="6px" />
              <AoiSkeleton width="120px" height="16px" radius="4px" />
            </div>
          </div>
        </div>

        <!-- Skeleton Main Layout -->
        <div class="me-main-layout">
          <aside class="me-desktop-sidebar">
            <AoiSkeletonGroup layout="stack" gap="8px" class="me-nav-menu" style="padding: 8px;">
              <AoiSkeleton v-for="i in 5" :key="i" height="42px" radius="8px" />
            </AoiSkeletonGroup>
          </aside>
          <main class="me-subpage-container">
            <AoiSkeletonGroup layout="stack" gap="16px">
              <AoiSkeleton height="150px" radius="12px" />
              <AoiSkeleton height="260px" radius="12px" />
            </AoiSkeletonGroup>
          </main>
        </div>
      </div>
    </AoiReveal>

    <div v-else-if="profileError && !profile" class="me-error-wrapper">
      <AoiStatusMessage intent="danger" icon="alert-circle">
        {{ profileError }}
      </AoiStatusMessage>
      <AoiButton variant="filled" tone="accent" @click="loadProfile">
        {{ t("me.saveChanges") }}
      </AoiButton>
    </div>

    <AoiReveal
      v-else-if="profile"
      variant="pop"
      duration="400"
      tag="div"
      class="me-content-root"
    >
      <!-- 1. Premium Profile Hero Header -->
      <div class="me-hero-header">
        <div
          class="me-hero-banner"
          :style="profile.bannerUrl ? { backgroundImage: `url(${profile.bannerUrl})` } : {}"
        ></div>
        <div class="me-hero-body">
          <div class="me-hero-avatar-wrapper">
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              :alt="profile.displayName"
              class="me-hero-avatar"
            />
            <div v-else class="me-hero-avatar-fallback">
              {{ profile.displayName.charAt(0).toUpperCase() }}
            </div>
          </div>
          
          <div class="me-hero-details">
            <div class="me-hero-name-row">
              <h2 class="me-hero-display-name">{{ profile.displayName }}</h2>
              <span class="me-hero-role-pill">{{ roleLabel(profile.role) }}</span>
            </div>
            <p class="me-hero-handle">@{{ profile.handle }}</p>
          </div>

          <div class="me-hero-actions">
            <AoiButton
              variant="outlined"
              tone="neutral"
              icon="log-out"
              size="sm"
              :disabled="loggingOut"
              @click="logout"
            >
              {{ loggingOut ? t("me.loggingOut") : t("me.logout") }}
            </AoiButton>
          </div>
        </div>
      </div>

      <!-- 2. Main Navigation & Content Layout -->
      <div class="me-main-layout">
        <!-- Desktop Sidebar (Sleek List Navigation) -->
        <aside class="me-desktop-sidebar">
          <div class="me-nav-menu">
            <button
              v-for="item in tabItems"
              :key="item.value"
              class="me-nav-item"
              :class="{ 'me-nav-item--active': item.value === activeTab }"
              @click="activeTab = item.value"
            >
              <AoiRipple />
              <div class="me-nav-item-left">
                <AoiIcon :name="item.icon || 'circle-user-round'" :size="18" />
                <span>{{ item.label }}</span>
              </div>
              <AoiIcon class="me-nav-chevron" name="chevron-right" :size="14" />
            </button>
          </div>
        </aside>

        <!-- Mobile Horizontal Tab Bar -->
        <nav class="me-mobile-nav-scroll">
          <button
            v-for="item in tabItems"
            :key="item.value"
            class="me-mobile-nav-item"
            :class="{ 'me-mobile-nav-item--active': item.value === activeTab }"
            @click="activeTab = item.value"
          >
            <AoiRipple />
            <AoiIcon :name="item.icon || 'circle-user-round'" :size="16" />
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <!-- Subpage Content Panel -->
        <main class="me-subpage-container">
          <NuxtPage />
        </main>
      </div>
    </AoiReveal>
  </div>
</template>

<style scoped>
.me-page-container {
  max-width: var(--aoi-content-max-width);
  margin: 0 auto;
}

.me-loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--aoi-text-muted);
}

.me-loading-text {
  font-size: 0.95rem;
}

.me-error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
}

/* Premium Profile Hero Header */
.me-hero-header {
  position: relative;
  background: var(--aoi-surface-solid);
  border-radius: var(--aoi-radius-card);
  border: 1px solid var(--aoi-border);
  box-shadow: var(--aoi-shadow-sm);
  overflow: hidden;
  margin-bottom: var(--aoi-grid-gap);
}

.me-hero-banner {
  height: 140px;
  background: linear-gradient(135deg, var(--aoi-sakura-50) 0%, var(--aoi-secondary-50) 100%);
  background-size: cover;
  background-position: center;
  opacity: 0.9;
  position: relative;
}

.me-hero-body {
  display: flex;
  align-items: flex-end;
  padding: 0 var(--aoi-panel-padding) var(--aoi-panel-padding);
  gap: 20px;
  position: relative;
}

.me-hero-avatar-wrapper {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: var(--aoi-radius-round);
  border: 4px solid var(--aoi-surface-solid);
  box-shadow: var(--aoi-shadow-md);
  background: var(--aoi-accent-10);
  overflow: hidden;
  margin-top: -48px;
  flex-shrink: 0;
  z-index: 2;
}

.me-hero-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.me-hero-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: 750;
  color: var(--aoi-accent-60);
}

.me-hero-details {
  flex: 1;
  padding-bottom: 6px;
}

.me-hero-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.me-hero-display-name {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--aoi-text);
  line-height: 1.2;
}

.me-hero-role-pill {
  font-size: 0.7rem;
  font-weight: 750;
  padding: 2px 10px;
  background: var(--aoi-accent-10);
  color: var(--aoi-accent-60);
  border-radius: var(--aoi-radius-round);
  border: 1px solid color-mix(in srgb, var(--aoi-accent-60) 15%, transparent);
}

.me-hero-handle {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: var(--aoi-text-muted);
}

.me-hero-actions {
  padding-bottom: 6px;
}

/* Main Navigation & Content Layout */
.me-main-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--aoi-grid-gap);
  align-items: start;
}

.me-desktop-sidebar {
  display: block;
}

.me-nav-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--aoi-surface-solid);
  border: 1px solid var(--aoi-border);
  border-radius: var(--aoi-radius-card);
  padding: 8px;
  box-shadow: var(--aoi-shadow-sm);
}

.me-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--aoi-radius-choice);
  background: transparent;
  color: var(--aoi-text-muted);
  border: none;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all var(--aoi-action-motion-base) var(--aoi-ease-out);
  position: relative;
  overflow: hidden;
}

.me-nav-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.me-nav-chevron {
  opacity: 0;
  transform: translateX(-4px);
  transition: all var(--aoi-action-motion-fast) var(--aoi-ease-out);
  color: var(--aoi-text-muted);
}

.me-nav-item:hover {
  background: var(--aoi-state-hover);
  color: var(--aoi-text);
}

.me-nav-item:hover .me-nav-chevron {
  opacity: 0.5;
  transform: translateX(0);
}

.me-nav-item--active {
  background: var(--aoi-accent-10) !important;
  color: var(--aoi-accent-60) !important;
}

.me-nav-item--active .me-nav-chevron {
  opacity: 1 !important;
  transform: translateX(0) !important;
  color: var(--aoi-accent-60) !important;
}

/* Mobile Scrollable Navigation */
.me-mobile-nav-scroll {
  display: none;
}

.me-subpage-container {
  min-width: 0;
}

/* Mobile Media Queries */
@media (max-width: 960px) {
  .me-main-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .me-desktop-sidebar {
    display: none;
  }

  .me-mobile-nav-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scroll-behavior: smooth;
    scrollbar-width: none; /* Firefox */
    padding: 2px 4px 8px;
    margin: 0 -4px;
    -webkit-overflow-scrolling: touch;
  }

  .me-mobile-nav-scroll::-webkit-scrollbar {
    display: none; /* Safari/Chrome */
  }

  .me-mobile-nav-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--aoi-radius-round);
    background: var(--aoi-surface-solid);
    color: var(--aoi-text-muted);
    font-size: 0.88rem;
    font-weight: 750;
    border: 1px solid var(--aoi-border);
    white-space: nowrap;
    cursor: pointer;
    box-shadow: var(--aoi-shadow-sm);
    transition: all var(--aoi-action-motion-base) var(--aoi-ease-out);
    position: relative;
    overflow: hidden;
  }

  .me-mobile-nav-item--active {
    background: var(--aoi-accent-10) !important;
    border-color: var(--aoi-accent-30) !important;
    color: var(--aoi-accent-60) !important;
  }
}

@media (max-width: 760px) {
  .me-hero-banner {
    height: 100px;
  }

  .me-hero-body {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 16px 20px;
    gap: 12px;
  }

  .me-hero-avatar-wrapper {
    margin-top: -48px;
  }

  .me-hero-details {
    padding-bottom: 0;
  }

  .me-hero-name-row {
    justify-content: center;
  }

  .me-hero-actions {
    padding-bottom: 0;
    width: 100%;
    display: flex;
    justify-content: center;
  }
}
</style>