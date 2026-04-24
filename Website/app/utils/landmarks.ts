export enum PoseLandmark {
	Nose = 0,
	LeftEyeInner = 1,
	LeftEye = 2,
	LeftEyeOuter = 3,
	RightEyeInner = 4,
	RightEye = 5,
	RightEyeOuter = 6,
	LeftEar = 7,
	RightEar = 8,
	MouthLeft = 9,
	MouthRight = 10,
	LeftShoulder = 11,
	RightShoulder = 12,
	LeftElbow = 13,
	RightElbow = 14,
	LeftWrist = 15,
	RightWrist = 16,
	LeftPinky = 17,
	RightPinky = 18,
	LeftIndex = 19,
	RightIndex = 20,
	LeftThumb = 21,
	RightThumb = 22,
	LeftHip = 23,
	RightHip = 24,
	LeftKnee = 25,
	RightKnee = 26,
	LeftAnkle = 27,
	RightAnkle = 28,
	LeftHeel = 29,
	RightHeel = 30,
	LeftFootIndex = 31,
	RightFootIndex = 32,
}

export enum HandLandmark {
	Wrist = 0,
	ThumbCMC = 1,
	ThumbMCP = 2,
	ThumbIP = 3,
	ThumbTIP = 4,
	IndexFingerMCP = 5,
	IndexFingerPIP = 6,
	IndexFingerDIP = 7,
	IndexFingerTIP = 8,
	MiddleFingerMCP = 9,
	MiddleFingerPIP = 10,
	MiddleFingerDIP = 11,
	MiddleFingerTIP = 12,
	RingFingerMCP = 13,
	RingFingerPIP = 14,
	RingFingerDIP = 15,
	RingFingerTIP = 16,
	PinkyMCP = 17,
	PinkyPIP = 18,
	PinkyDIP = 19,
	PinkyTIP = 20,
}

export type LandmarkPoint = {
	x: number
	y: number
	z?: number
	visibility?: number
}

export type LandmarkList = LandmarkPoint[] | null | undefined

export type HolisticResults = {
	poseLandmarks?: LandmarkPoint[] | null
	leftHandLandmarks?: LandmarkPoint[] | null
	rightHandLandmarks?: LandmarkPoint[] | null
	faceLandmarks?: LandmarkPoint[] | null
}

export const getPoseLandmark = (landmarks: LandmarkList, landmark: PoseLandmark) => {
	return landmarks?.[landmark] ?? null
}

export const getHandLandmark = (landmarks: LandmarkList, landmark: HandLandmark) => {
	return landmarks?.[landmark] ?? null
}
