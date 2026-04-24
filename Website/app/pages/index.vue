<template>
	<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
		<div class="w-full max-w-2xl">
			<div class="space-y-8">
				<div class="text-center">
					<h1 class="text-4xl font-bold text-white">VRM Tracker</h1>
					<p class="mt-2 text-slate-300">Select your character to begin</p>
				</div>

				<div class="grid gap-6 grid-cols-2">
					<UCard v-for="character in characters" :key="character.id">
						<div class="space-y-4">
							<div class="flex aspect-square w-full items-center justify-center rounded-md bg-slate-700">
								<UIcon name="lucide:user" class="h-16 w-16 text-slate-400" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-white">{{ character.name }}</h3>
								<p class="text-sm text-slate-400">{{ character.description }}</p>
							</div>
						</div>

						<UButton class="mt-4 w-full" :trailing="false" @click="selectCharacter(character)"> Select </UButton>
					</UCard>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Icon } from "#components"
import { useSelectedCharacter, type Character } from "~/composables/useSelectedCharacter"

definePageMeta({
	layout: false,
})

const characters: Character[] = [
	{
		id: "avatar-b",
		name: "Avatar B",
		description: "Sample character B",
		model: "/Avatar_SampleB.vrm",
	},
	{
		id: "avatar-c",
		name: "Avatar C",
		description: "Sample character C",
		model: "/Avatar_SampleC.vrm",
	},
]

const { setCharacter } = useSelectedCharacter()
const router = useRouter()

const selectCharacter = (character: Character) => {
	setCharacter(character)
	router.push("/tracker")
}
</script>
