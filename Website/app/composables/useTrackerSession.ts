export type InputMode = "webcam" | "video"
export type EvaluationMode = "none" | "evaluation"

export type TrackerSessionExport = {
	inputMode: InputMode
	evaluationMode: EvaluationMode
	selectedNoteId: string | null
	customModelName: string | null
	sourceVideoName: string | null
	selectedCharacterId: string | null
}

const customModelObjectUrl = ref<string | null>(null)
const sourceVideoObjectUrl = ref<string | null>(null)

const inputMode = ref<InputMode>("video")
const evaluationMode = ref<EvaluationMode>("none")
const selectedNoteId = ref<string | null>(null)
const customModelName = ref<string | null>(null)
const sourceVideoName = ref<string | null>(null)

export const useTrackerSession = () => {
	const { selectedCharacter, setCharacter, clearCharacter } = useSelectedCharacter()

	const activeModelPath = computed(() => customModelObjectUrl.value ?? selectedCharacter.value?.model ?? null)
	const activeModelLabel = computed(() => customModelName.value ?? selectedCharacter.value?.name ?? null)
	const activeSourceVideoUrl = computed(() => sourceVideoObjectUrl.value)
	const hasModelSelection = computed(() => Boolean(activeModelPath.value))
	const selectedNote = computed<ViolinNoteOption | null>(() => {
		return VIOLIN_NOTE_OPTIONS.find((option) => option.id === selectedNoteId.value) ?? null
	})

	const setSourceMode = (mode: InputMode) => {
		inputMode.value = mode
	}

	const setEvaluationMode = (mode: EvaluationMode) => {
		evaluationMode.value = mode
		if (mode === "none") {
			selectedNoteId.value = null
		}
	}

	const selectBuiltInCharacter = (character: Character) => {
		if (customModelObjectUrl.value) {
			URL.revokeObjectURL(customModelObjectUrl.value)
			customModelObjectUrl.value = null
		}
		customModelName.value = null
		setCharacter(character)
	}

	const setCustomModel = (file: File | null) => {
		if (customModelObjectUrl.value) {
			URL.revokeObjectURL(customModelObjectUrl.value)
			customModelObjectUrl.value = null
		}

		if (!file) {
			customModelName.value = null
			clearCharacter()
			return
		}

		customModelObjectUrl.value = URL.createObjectURL(file)
		customModelName.value = file.name
		clearCharacter()
	}

	const setSourceVideo = (file: File | null) => {
		if (sourceVideoObjectUrl.value) {
			URL.revokeObjectURL(sourceVideoObjectUrl.value)
			sourceVideoObjectUrl.value = null
		}

		if (!file) {
			sourceVideoName.value = null
			return
		}

		sourceVideoObjectUrl.value = URL.createObjectURL(file)
		sourceVideoName.value = file.name
	}

	const setSelectedNoteId = (noteId: string | null) => {
		selectedNoteId.value = noteId
	}

	const exportSession = (): string => {
		const payload: TrackerSessionExport = {
			inputMode: inputMode.value,
			evaluationMode: evaluationMode.value,
			selectedNoteId: selectedNoteId.value,
			customModelName: customModelName.value,
			sourceVideoName: sourceVideoName.value,
			selectedCharacterId: selectedCharacter.value?.id ?? null,
		}

		return JSON.stringify(payload, null, 2)
	}

	const importSession = (rawJson: string) => {
		const parsed = JSON.parse(rawJson) as Partial<TrackerSessionExport>
		if (parsed.inputMode === "webcam" || parsed.inputMode === "video") {
			inputMode.value = parsed.inputMode
		}
		if (parsed.evaluationMode === "none" || parsed.evaluationMode === "evaluation") {
			evaluationMode.value = parsed.evaluationMode
		}
		selectedNoteId.value = typeof parsed.selectedNoteId === "string" ? parsed.selectedNoteId : null
		customModelName.value = typeof parsed.customModelName === "string" ? parsed.customModelName : null
		sourceVideoName.value = typeof parsed.sourceVideoName === "string" ? parsed.sourceVideoName : null
	}

	return {
		inputMode,
		evaluationMode,
		selectedNoteId,
		customModelName,
		sourceVideoName,
		selectedCharacter,
		activeModelPath,
		activeModelLabel,
		activeSourceVideoUrl,
		hasModelSelection,
		selectedNote,
		setSourceMode,
		setEvaluationMode,
		selectBuiltInCharacter,
		setCustomModel,
		setSourceVideo,
		setSelectedNoteId,
		exportSession,
		importSession,
	}
}
