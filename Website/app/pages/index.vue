<template>
	<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
		<div class="w-full max-w-2xl">
			<div class="space-y-8">
				<div class="text-center">
					<h1 class="text-4xl font-bold text-white">VRM Tracker</h1>
					<p class="mt-2 text-slate-300">Select your character to begin</p>
				</div>

				<div class="grid gap-6 sm:grid-cols-2">
					<button
						v-for="character in characters"
						:key="character.id"
						@click="selectCharacter(character)"
						class="group relative overflow-hidden rounded-lg border-2 border-slate-600 bg-slate-800 p-6 transition-all hover:border-blue-500 hover:bg-slate-700"
					>
						<div class="space-y-4">
							<div class="aspect-square w-full rounded-md bg-slate-700 flex items-center justify-center">
								<Icon name="lucide:user" class="h-16 w-16 text-slate-400" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-white">{{ character.name }}</h3>
								<p class="text-sm text-slate-400">{{ character.description }}</p>
							</div>
							<UButton
								color="blue"
								class="w-full"
								:trailing="false"
							>
								Select
							</UButton>
						</div>
						<div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-transparent opacity-0 transition-opacity group-hover:opacity-10" />
					</button>
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
