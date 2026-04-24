<template>
	<div>
		<VRMTracker
			v-if="selectedCharacter"
			:model-path="selectedCharacter.model"
			@quit="returnToLobby"
		/>
	</div>
</template>

<script setup lang="ts">
import { useSelectedCharacter } from "~/composables/useSelectedCharacter"

definePageMeta({
	layout: false,
})

const { selectedCharacter, clearCharacter } = useSelectedCharacter()
const router = useRouter()

const returnToLobby = () => {
	clearCharacter()
	router.push("/")
}

onMounted(() => {
	if (!selectedCharacter.value) {
		router.push("/")
	}
})
</script>
