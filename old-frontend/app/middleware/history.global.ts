export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.client) {
    const authPages = ["/login", "/register"]
    if (from && from.path && !authPages.includes(from.path)) {
      sessionStorage.setItem("last_non_auth_route", from.fullPath)
    }
  }
})
