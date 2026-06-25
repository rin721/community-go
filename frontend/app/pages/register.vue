<script setup lang="ts">
const displayName = ref("")
const email = ref("")
const password = ref("")
const submitted = ref(false)

const canSubmit = computed(() => {
  return displayName.value.trim().length >= 2
    && email.value.trim().length > 0
    && password.value.length >= 6
})

function submitRegister() {
  if (!canSubmit.value) {
    return
  }

  submitted.value = true
}

useHead({
  title: "注册 - Aoi"
})
</script>

<template>
  <div class="aoi-page auth-page">
    <AuthShell labelledby="register-title" visual-position="end">
      <AuthPanel
        title-id="register-title"
        title="创建账号"
        description="先保留一个轻量注册入口，用来预览未来账号体系和跳转转场。"
        submit-label="注册"
        submit-icon="user-plus"
        :disabled="!canSubmit"
        :success-message="submitted ? '已创建演示账号。真实注册逻辑可以在接入后端鉴权接口后补齐。' : undefined"
        @submit="submitRegister"
      >
        <template #fields>
          <AoiTextField
            v-model="displayName"
            label="昵称"
            placeholder="Rin721"
            supporting-text="至少 2 个字符"
            appearance="outlined"
            @enter="submitRegister"
          />
          <AoiTextField
            v-model="email"
            label="邮箱"
            placeholder="rin@example.com"
            type="email"
            appearance="outlined"
            @enter="submitRegister"
          />
          <AoiTextField
            v-model="password"
            label="密码"
            supporting-text="至少 6 位即可触发演示状态"
            type="password"
            appearance="outlined"
            @enter="submitRegister"
          />
        </template>

        <template #switch>
          <span>已经有账号？</span>
          <AoiLink to="/login">去登录</AoiLink>
        </template>
      </AuthPanel>

      <template #visual>
        <AuthMotionVisual title="Join" variant="register" />
      </template>
    </AuthShell>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: calc(100vh - 36px);
  align-items: center;
}

@media (max-width: 639px) {
  .auth-page {
    min-height: calc(100vh - var(--aoi-mobile-nav-height));
  }
}
</style>
