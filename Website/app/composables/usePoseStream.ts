import { reactive } from "vue"
import { type HolisticResults, type LandmarkPoint, HandLandmark, PoseLandmark, getHandLandmark, getPoseLandmark } from "@/utils/landmarks"

// mediapipe
// (from camera perspective)
// positive z is distance from cam
// positive x is right of cam
// positive y is down of cam

// need to flip y and z for three.js

export const usePoseStream = () => {
	const state = reactive({
		pose: null as LandmarkPoint[] | null,
		hands: null as { left: LandmarkPoint[] | null; right: LandmarkPoint[] | null } | null,
		face: null as LandmarkPoint[] | null,
	})

	const update = (results: HolisticResults) => {
		const flipX = 1
		const flipY = -1
		const flipZ = -1
		results.poseLandmarks = results.poseLandmarks?.map((lm) => ({ ...lm, x: lm.x * flipX, y: lm.y * flipY, z: lm.z * flipZ })) ?? null
		results.leftHandLandmarks = results.leftHandLandmarks?.map((lm) => ({ ...lm, x: lm.x * flipX, y: lm.y * flipY, z: lm.z * flipZ })) ?? null
		results.rightHandLandmarks = results.rightHandLandmarks?.map((lm) => ({ ...lm, x: lm.x * flipX, y: lm.y * flipY, z: lm.z * flipZ })) ?? null
		results.faceLandmarks = results.faceLandmarks?.map((lm) => ({ ...lm, x: lm.x * flipX, y: lm.y * flipY, z: lm.z * flipZ })) ?? null

		state.pose = results.poseLandmarks
		state.hands = {
			left: results.leftHandLandmarks,
			right: results.rightHandLandmarks,
		}
		state.face = results.faceLandmarks
	}

	const getPose = (landmark: PoseLandmark) => {
		return getPoseLandmark(state.pose, landmark)
	}

	const getHand = (landmark: HandLandmark, left = true) => {
		return left ? getHandLandmark(state.hands?.left, landmark) : getHandLandmark(state.hands?.right, landmark)
	}

	return {
		state,
		update,
		getPose,
		getHand,
	}
}
