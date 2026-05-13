<template>
	<div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-xs tracking-[0.3em] text-slate-400 uppercase">Note target</p>
				<h2 class="text-lg font-medium text-white">Violin positions</h2>
			</div>
			<span class="text-xs text-slate-400">{{ noteOptions.length }} options</span>
		</div>

		<div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
			<div class="mb-2 flex items-center justify-between gap-2">
				<p class="text-xs tracking-[0.3em] text-slate-400 uppercase">String note grid</p>
				<p class="text-xs text-slate-400">Selected: {{ selectedNoteLabel || "None" }}</p>
			</div>
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<div v-for="column in groupedNoteColumns" :key="column.stringName" class="rounded-lg border border-white/10 bg-slate-950/40 p-2">
					<p class="text-center text-xs font-semibold tracking-[0.2em] text-slate-300">{{ column.stringName }} string</p>
					<div class="mt-2 grid gap-1">
						<UButton
							v-for="note in column.notes"
							:key="note.id"
							size="xs"
							:color="selectedNoteId === note.id ? 'primary' : 'neutral'"
							:variant="selectedNoteId === note.id ? 'solid' : 'outline'"
							class="h-8 w-full justify-center"
							@click="selectedNoteIdModel = note.id"
						>
							{{ note.label }}
						</UButton>
					</div>
				</div>
			</div>
		</div>
		<div class="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-slate-300">
			<p class="text-xs tracking-[0.3em] text-slate-400 uppercase">Current note</p>
			<p class="mt-1">{{ selectedNoteLabel || "No note selected" }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
const session = useTrackerSession()
const noteOptions = VIOLIN_NOTE_OPTIONS
const stringOrder: ViolinStringName[] = ["G", "D", "A", "E"]

const selectedNoteId = computed(() => session.selectedNoteId.value)
const selectedNoteLabel = computed(() => session.selectedNote.value?.label ?? null)

const groupedNoteColumns = computed(() => {
	return stringOrder.map((stringName) => ({
		stringName,
		notes: noteOptions.filter((note) => note.stringName === stringName).sort((a, b) => a.semitoneOffset - b.semitoneOffset),
	}))
})

const selectedNoteIdModel = computed({
	get: () => session.selectedNoteId.value ?? undefined,
	set: (value: string | undefined) => session.setSelectedNoteId(value ?? null),
})
</script>
