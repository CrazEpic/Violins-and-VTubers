import { ref } from "vue"

export interface Character {
	id: string
	name: string
	description: string
	model: string
	image: string
}

const selectedCharacter = ref<Character | null>(null)

export const useSelectedCharacter = () => {
	const setCharacter = (character: Character) => {
		selectedCharacter.value = character
	}

	const clearCharacter = () => {
		selectedCharacter.value = null
	}

	return {
		selectedCharacter,
		setCharacter,
		clearCharacter,
	}
}
