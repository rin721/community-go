<script setup lang="ts">
import Cropper from "cropperjs"
import "cropperjs/dist/cropper.css"
import type { AccountProfileResponse } from "~/types/api"

const props = defineProps<{
  profile: AccountProfileResponse
}>()

const emit = defineEmits<{
  update: [profile: AccountProfileResponse]
}>()

const api = useAoiApi()
const { t } = useI18n()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

function triggerFileSelect() {
  fileInputRef.value?.click()
}

const cropDialogOpen = ref(false)
const cropMode = ref<"direct" | "manual">("direct")
const selectedImageUrl = ref("")
const selectedImageName = ref("")
const cropperImgRef = ref<HTMLImageElement | null>(null)
let cropperInstance: Cropper | null = null

watch(cropDialogOpen, async (val) => {
  if (val) {
    await nextTick()
    if (cropperImgRef.value) {
      cropperInstance = new Cropper(cropperImgRef.value, {
        aspectRatio: 4, // 4:1 banner aspect ratio
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.95,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        background: false
      })
    }
  } else {
    destroyCropper()
  }
})

function destroyCropper() {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
}

function zoomCropper(ratio: number) {
  cropperInstance?.zoom(ratio)
}

function rotateCropper(degree: number) {
  cropperInstance?.rotate(degree)
}

function onCropCancel() {
  cropDialogOpen.value = false
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
    selectedImageUrl.value = ""
  }
}

async function saveCroppedBanner() {
  if (!cropperInstance) return
  uploading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const canvas = cropperInstance.getCroppedCanvas({
      width: 1200,
      height: 300,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high"
    })

    if (!canvas) {
      throw new Error("无法获取剪裁区域")
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", 0.85)
    })

    if (!blob) {
      throw new Error("图片生成失败")
    }

    const webpFile = new File([blob], "banner.webp", {
      type: "image/webp",
      lastModified: Date.now()
    })

    const res = await api.uploadAccountBanner(webpFile)
    const updatedProfile = { ...props.profile, bannerUrl: res.bannerUrl }
    emit("update", updatedProfile)

    successMessage.value = "背景图裁剪并压缩上传成功"
    cropDialogOpen.value = false
  } catch (err: any) {
    if (err.statusCode === 429 || err.message?.includes("cooldown")) {
      errorMessage.value = "操作过于频繁，背景图修改冷却中，请稍后再试"
    } else {
      errorMessage.value = err.message || "背景图上传失败，请重试"
    }
  } finally {
    uploading.value = false
    onCropCancel()
  }
}

function processImageToWebp(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("无法创建图片上下文"))
          return
        }

        const targetW = 1200
        const targetH = 300
        canvas.width = targetW
        canvas.height = targetH

        // Center crop to 4:1 aspect ratio
        let sx = 0
        let sy = 0
        let sWidth = img.width
        let sHeight = img.height

        const currentAspect = img.width / img.height
        const targetAspect = 4

        if (currentAspect > targetAspect) {
          sWidth = img.height * targetAspect
          sx = (img.width - sWidth) / 2
        } else {
          sHeight = img.width / targetAspect
          sy = (img.height - sHeight) / 2
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], "banner.webp", {
                type: "image/webp",
                lastModified: Date.now()
              })
              resolve(processedFile)
            } else {
              reject(new Error("图片处理失败"))
            }
          },
          "image/webp",
          0.85
        )
      }
      img.onerror = () => reject(new Error("图片加载失败"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("文件读取失败"))
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate size
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = "背景图片大小不能超过 5MB"
    target.value = ""
    return
  }

  // Validate type
  if (!file.type.startsWith("image/")) {
    errorMessage.value = "请选择合法的图片文件"
    target.value = ""
    return
  }

  selectedImageName.value = file.name
  selectedImageUrl.value = URL.createObjectURL(file)
  target.value = ""

  if (cropMode.value === "direct") {
    uploading.value = true
    errorMessage.value = null
    successMessage.value = null
    try {
      const processedFile = await processImageToWebp(file)
      const res = await api.uploadAccountBanner(processedFile)
      const updatedProfile = { ...props.profile, bannerUrl: res.bannerUrl }
      emit("update", updatedProfile)
      successMessage.value = "背景图自动裁剪上传成功"
    } catch (err: any) {
      if (err.statusCode === 429 || err.message?.includes("cooldown")) {
        errorMessage.value = "操作过于频繁，背景图修改冷却中，请稍后再试"
      } else {
        errorMessage.value = err.message || "背景图自动上传失败，请选择裁剪模式重试"
      }
    } finally {
      uploading.value = false
      onCropCancel()
    }
  } else {
    cropDialogOpen.value = true
  }
}

function handleDirectUpload() {
  cropMode.value = "direct"
  triggerFileSelect()
}

function handleCropUpload() {
  cropMode.value = "manual"
  triggerFileSelect()
}

async function handleDeleteBanner() {
  if (uploading.value) return
  uploading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const res = await api.deleteAccountBanner()
    const updatedProfile = { ...props.profile, bannerUrl: "" }
    emit("update", updatedProfile)
    successMessage.value = "背景图已成功删除"
  } catch (err: any) {
    errorMessage.value = err.message || "背景图删除失败，请重试"
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="aoi-banner-manager">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png, image/jpeg, image/webp"
      style="display: none"
      @change="handleFileChange"
    />

    <div class="banner-manager__layout">
      <!-- Rectangular Banner Preview -->
      <div class="banner-manager__preview" @click="handleCropUpload">
        <img
          v-if="profile.bannerUrl"
          :src="profile.bannerUrl"
          alt="Banner Preview"
          class="banner-manager__image"
        />
        <div v-else class="banner-manager__placeholder">
          <AoiIcon name="image" :size="24" />
          <span>点击设置主页背景</span>
        </div>
        <div class="banner-manager__overlay">
          <AoiIcon name="camera" :size="18" />
          <span>更换背景图</span>
        </div>
      </div>

      <!-- Action Panel -->
      <div class="banner-manager__actions-panel">
        <div class="banner-manager__btn-row">
          <AoiButton
            variant="filled"
            tone="accent"
            icon="upload"
            :loading="uploading && cropMode === 'direct'"
            :disabled="uploading"
            @click="handleDirectUpload"
          >
            直接上传背景
          </AoiButton>

          <AoiButton
            variant="outlined"
            tone="accent"
            icon="crop"
            :disabled="uploading"
            @click="handleCropUpload"
          >
            裁剪并上传
          </AoiButton>

          <AoiButton
            v-if="profile.bannerUrl"
            variant="outlined"
            tone="danger"
            icon="trash-2"
            :loading="uploading && !selectedImageUrl"
            :disabled="uploading"
            @click="handleDeleteBanner"
          >
            删除当前背景
          </AoiButton>
        </div>

        <small class="banner-manager__tip">
          支持 JPG, PNG, WEBP 格式，大小不超过 5MB。使用“直接上传”将居中裁剪，使用“裁剪并上传”可手动调整区域。
        </small>
      </div>
    </div>

    <!-- Feedback messages -->
    <div class="banner-manager__feedback">
      <AoiStatusMessage v-if="errorMessage" intent="danger" icon="alert-circle">
        {{ errorMessage }}
      </AoiStatusMessage>
      <AoiStatusMessage v-if="successMessage" intent="success" icon="check-circle-2">
        {{ successMessage }}
      </AoiStatusMessage>
    </div>

    <!-- Manual Cropping Dialog -->
    <AoiDialog
      v-model="cropDialogOpen"
      title="裁剪背景图片 (4:1)"
      size="md"
      :close-on-content-click="false"
      @close="onCropCancel"
    >
      <div class="banner-crop-workbench">
        <div class="banner-crop-canvas-wrapper">
          <img ref="cropperImgRef" :src="selectedImageUrl" class="banner-crop-image" />
        </div>

        <div class="banner-crop-controls">
          <AoiButton variant="outlined" tone="neutral" icon="zoom-in" @click="zoomCropper(0.1)">
            放大
          </AoiButton>
          <AoiButton variant="outlined" tone="neutral" icon="zoom-out" @click="zoomCropper(-0.1)">
            缩小
          </AoiButton>
          <AoiButton variant="outlined" tone="neutral" icon="rotate-cw" @click="rotateCropper(90)">
            旋转
          </AoiButton>
        </div>
      </div>

      <template #actions>
        <AoiButton
          variant="filled"
          tone="accent"
          icon="check"
          :loading="uploading"
          @click="saveCroppedBanner"
        >
          确定使用
        </AoiButton>
        <AoiButton
          variant="plain"
          tone="neutral"
          :disabled="uploading"
          @click="onCropCancel"
        >
          取消
        </AoiButton>
      </template>
    </AoiDialog>
  </div>
</template>

<style scoped>
.aoi-banner-manager {
  display: grid;
  gap: 16px;
}

.banner-manager__layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-manager__preview {
  position: relative;
  width: 100%;
  max-width: 480px;
  height: 120px;
  border-radius: var(--aoi-radius-card);
  overflow: hidden;
  cursor: pointer;
  background: var(--aoi-surface-muted);
  border: 1px solid var(--aoi-border);
  box-shadow: var(--aoi-shadow-sm);
  transition: transform var(--aoi-duration-fast) var(--aoi-ease-out), border-color var(--aoi-duration-fast) var(--aoi-ease-out);
}

.banner-manager__preview:hover {
  transform: scale(1.01);
  border-color: var(--aoi-accent-40);
}

.banner-manager__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-manager__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--aoi-text-muted);
  font-size: 0.88rem;
  font-weight: 700;
}

.banner-manager__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--aoi-duration-fast) var(--aoi-ease-out);
}

.banner-manager__preview:hover .banner-manager__overlay {
  opacity: 1;
}

.banner-manager__actions-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.banner-manager__btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.banner-manager__tip {
  color: var(--aoi-text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.banner-manager__feedback {
  margin-top: 4px;
}

/* Crop Workbench */
.banner-crop-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.banner-crop-canvas-wrapper {
  width: 100%;
  height: 240px;
  background: #000;
  border-radius: var(--aoi-radius-card);
  overflow: hidden;
}

.banner-crop-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.banner-crop-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
}

@media (min-width: 768px) {
  .banner-manager__layout {
    flex-direction: row;
    align-items: center;
    gap: 24px;
  }
}
</style>
