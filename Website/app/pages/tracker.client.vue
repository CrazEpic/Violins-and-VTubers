<template>
	<VRMTracker
		v-if="activeModelPath"
		:input-mode="inputMode"
		:evaluation-mode="evaluationMode"
		:model-path="activeModelPath"
		:source-video-url="activeSourceVideoUrl ?? undefined"
		@quit="returnToLobby"
	/>
</template>

<script setup lang="ts">
import { useTrackerSession } from "@/composables/useTrackerSession"

definePageMeta({
	layout: false,
})

const { activeModelPath, inputMode, evaluationMode, activeSourceVideoUrl } = useTrackerSession()

const returnToLobby = () => {
	navigateTo("/")
}

onMounted(() => {
	if (!activeModelPath.value) {
		navigateTo("/")
	}
})
</script>
