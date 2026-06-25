<script setup lang="ts">
const email = ref("")
const password = ref("")
const submitted = ref(false)

const canSubmit = computed(() => email.value.trim().length > 0 && password.value.length >= 6)

function submitLogin() {
  if (!canSubmit.value) {
    return
  }

  submitted.value = true
}

useHead({
  title: "登录 - Aoi"
})
</script>

<template>
  <div class="aoi-page auth-page">
    <AuthShell labelledby="login-title">
      <template #visual>
        <AuthMotionVisual title="Login" />
      </template>

      <AuthPanel
        title-id="login-title"
        title="登录 Aoi"
        description="这里先做前端演示登录，不会请求后端，也不会写入账号数据。"
        submit-label="登录"
        submit-icon="log-in"
        :disabled="!canSubmit"
        :success-message="submitted ? '已进入演示登录状态，后续接入 Go API 时可替换为真实鉴权。' : undefined"
        @submit="submitLogin"
      >
        <template #fields>
          <AoiTextField
            v-model="email"
            label="邮箱"
            placeholder="rin@example.com"
            type="email"
            appearance="outlined"
            @enter="submitLogin"
          />
          <AoiTextField
            v-model="password"
            label="密码"
            supporting-text="至少 6 位即可触发演示状态"
            type="password"
            appearance="outlined"
            @enter="submitLogin"
          />
        </template>

        <p class="auth-panel__url-demo">
          <span>示例地址</span>
          <AoiLink to="https://www.iqwq.com/login" external target="_blank" />
        </p>

        <template #switch>
          <span>还没有账号？</span>
          <AoiLink to="/register">去注册</AoiLink>
        </template>
      </AuthPanel>
    </AuthShell>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: calc(100vh - 36px);
  align-items: center;
}

.auth-panel__url-demo {
  color: var(--aoi-text-muted);
  line-height: 1.7;
}

.auth-panel__url-demo {
  display: grid;
  margin: 0;
  gap: 4px;
}

.auth-panel__url-demo span {
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 639px) {
  .auth-page {
    min-height: calc(100vh - var(--aoi-mobile-nav-height));
  }
}
</style>
