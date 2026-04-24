<template>
	<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
		<div class="w-full max-w-2xl">
			<div class="space-y-8">
				<div class="text-center">
					<h1 class="text-4xl font-bold text-white">VRM Tracker</h1>
					<p class="mt-2 text-slate-300">Select your character to begin</p>
				</div>

				<div class="grid grid-cols-3 gap-6">
					<UCard v-for="character in characters" :key="character.id">
						<div class="space-y-4">
							<img :src="character.image" alt="Character Image" class="aspect-square w-full object-cover" />
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
definePageMeta({
	layout: false,
})

const characters: Character[] = [
	{
		id: "avatar-a",
		name: "Avatar A",
		image: "Avatar_SampleA.png",
		description: "Sample character A",
		model: "/Avatar_SampleA.vrm",
	},
	{
		id: "avatar-b",
		name: "Avatar B",
		image: "Avatar_SampleB.png",
		description: "Sample character B",
		model: "/Avatar_SampleB.vrm",
	},
	{
		id: "avatar-c",
		name: "Avatar C",
		image: "Avatar_SampleC.png",
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
