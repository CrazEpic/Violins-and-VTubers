import "@mediapipe/drawing_utils"
import "@mediapipe/holistic"
import "@mediapipe/camera_utils"
import type { drawConnectors as MediaPipeDrawConnectors, drawLandmarks as MediaPipeDrawLandmarks } from "@mediapipe/drawing_utils"
import type { Camera as MediaPipeCamera } from "@mediapipe/camera_utils"
import type { Holistic as MediaPipeHolistic, InputImage, LandmarkConnectionArray, Results } from "@mediapipe/holistic"

type DrawConnectorsFn = typeof MediaPipeDrawConnectors
type DrawLandmarksFn = typeof MediaPipeDrawLandmarks
type HolisticCtor = new (config: { locateFile: (file: string) => string }) => MediaPipeHolistic

type CameraCtor = new (
	video: HTMLVideoElement,
	options: {
		width: number
		height: number
		onFrame: () => Promise<void>
	}
) => MediaPipeCamera

type MediaPipeHolisticGlobals = {
	Holistic?: HolisticCtor
	FACEMESH_TESSELATION?: LandmarkConnectionArray
	HAND_CONNECTIONS?: LandmarkConnectionArray
	POSE_CONNECTIONS?: LandmarkConnectionArray
}

type MediaPipeDrawingGlobals = {
	drawConnectors?: DrawConnectorsFn
	drawLandmarks?: DrawLandmarksFn
}

type RefLike<T> = {
	value: T | null | undefined
}

export const useMediaPipeHolistic = (videoRef: RefLike<HTMLVideoElement>, guideCanvasRef?: RefLike<HTMLCanvasElement>) => {
	const holistic = shallowRef<MediaPipeHolistic | null>(null)
	let camera: MediaPipeCamera | null = null
	let videoLoopId = 0
	let guideCanvasWidth = 0
	let guideCanvasHeight = 0
	let guideCanvasCtx: CanvasRenderingContext2D | null = null
	let holisticGlobals: Required<MediaPipeHolisticGlobals> | null = null
	let drawingGlobals: Required<MediaPipeDrawingGlobals> | null = null

	let onResultsCallback: ((results: Results) => void) | null = null

	const setOnResults = (callback: (results: Results) => void) => {
		onResultsCallback = callback
	}

	const resolveCameraCtor = (): CameraCtor => {
		const cameraCtor = (globalThis as { Camera?: CameraCtor }).Camera
		if (!cameraCtor) {
			throw new Error("MediaPipe Camera is unavailable on global scope")
		}

		return cameraCtor
	}

	const resolveHolisticGlobals = (): Required<MediaPipeHolisticGlobals> => {
		if (holisticGlobals) {
			return holisticGlobals
		}

		const globals = globalThis as MediaPipeHolisticGlobals
		if (!globals.Holistic || !globals.FACEMESH_TESSELATION || !globals.HAND_CONNECTIONS || !globals.POSE_CONNECTIONS) {
			throw new Error("MediaPipe Holistic globals are unavailable")
		}

		holisticGlobals = {
			Holistic: globals.Holistic,
			FACEMESH_TESSELATION: globals.FACEMESH_TESSELATION,
			HAND_CONNECTIONS: globals.HAND_CONNECTIONS,
			POSE_CONNECTIONS: globals.POSE_CONNECTIONS,
		}

		return holisticGlobals
	}

	const resolveDrawingGlobals = (): Required<MediaPipeDrawingGlobals> => {
		if (drawingGlobals) {
			return drawingGlobals
		}

		const globals = globalThis as MediaPipeDrawingGlobals
		if (!globals.drawConnectors || !globals.drawLandmarks) {
			throw new Error("MediaPipe drawing globals are unavailable")
		}

		drawingGlobals = {
			drawConnectors: globals.drawConnectors,
			drawLandmarks: globals.drawLandmarks,
		}

		return drawingGlobals
	}

	const drawResults = (results: Results) => {
		if (!videoRef.value || !guideCanvasRef?.value) {
			return
		}

		const { drawConnectors, drawLandmarks } = resolveDrawingGlobals()
		const { FACEMESH_TESSELATION, HAND_CONNECTIONS, POSE_CONNECTIONS } = resolveHolisticGlobals()

		const nextWidth = videoRef.value.videoWidth || guideCanvasRef.value.width
		const nextHeight = videoRef.value.videoHeight || guideCanvasRef.value.height
		if (!nextWidth || !nextHeight) {
			return
		}

		if (guideCanvasRef.value.width !== nextWidth) {
			guideCanvasRef.value.width = nextWidth
		}
		if (guideCanvasRef.value.height !== nextHeight) {
			guideCanvasRef.value.height = nextHeight
		}

		guideCanvasWidth = nextWidth
		guideCanvasHeight = nextHeight
		guideCanvasCtx = guideCanvasCtx ?? guideCanvasRef.value.getContext("2d")
		if (!guideCanvasCtx) {
			return
		}

		guideCanvasCtx.save()
		guideCanvasCtx.clearRect(0, 0, guideCanvasWidth, guideCanvasHeight)

		drawConnectors(guideCanvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
			color: "#00cff7",
			lineWidth: 4,
		})
		drawLandmarks(guideCanvasCtx, results.poseLandmarks, {
			color: "#ff0364",
			lineWidth: 2,
		})

		drawConnectors(guideCanvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
			color: "#C0C0C070",
			lineWidth: 1,
		})

		if (results.faceLandmarks && results.faceLandmarks.length === 478) {
			const leftIris = results.faceLandmarks[468]
			const rightIris = results.faceLandmarks[473]
			if (leftIris && rightIris) {
				drawLandmarks(guideCanvasCtx, [leftIris, rightIris], {
					color: "#ffe603",
					lineWidth: 2,
				})
			}
		}

		drawConnectors(guideCanvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
			color: "#eb1064",
			lineWidth: 5,
		})
		drawLandmarks(guideCanvasCtx, results.leftHandLandmarks, {
			color: "#00cff7",
			lineWidth: 2,
		})

		drawConnectors(guideCanvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
			color: "#22c3e3",
			lineWidth: 5,
		})
		drawLandmarks(guideCanvasCtx, results.rightHandLandmarks, {
			color: "#ff0364",
			lineWidth: 2,
		})

		guideCanvasCtx.restore()
	}

	const sendFrame = async (image: InputImage) => {
		if (!holistic.value) {
			return
		}

		await holistic.value.send({ image })
	}

	const init = async (baseUrl: string) => {
		const { Holistic } = resolveHolisticGlobals()

		holistic.value = new Holistic({
			locateFile: (file) => `${baseUrl}mediapipe/holistic/${file}`,
		})

		holistic.value.setOptions({
			modelComplexity: 2,
			smoothLandmarks: true,
			refineFaceLandmarks: true,
			minDetectionConfidence: 0.7,
			minTrackingConfidence: 0.7,
		})

		holistic.value.onResults((results) => {
			drawResults(results)
			onResultsCallback?.(results)
		})
	}

	const startWebcam = async () => {
		if (!videoRef.value) return

		const Camera = resolveCameraCtor()

		camera = new Camera(videoRef.value, {
			width: 640,
			height: 480,
			onFrame: async () => {
				if (holistic.value && videoRef.value) {
					await sendFrame(videoRef.value)
				}
			},
		})

		camera.start()
	}

	const startVideoLoop = async () => {
		if (!videoRef.value) return

		const loop = async () => {
			if (!holistic.value || !videoRef.value) {
				return
			}

			if (!videoRef.value.paused && !videoRef.value.ended) {
				await sendFrame(videoRef.value)
			}

			videoLoopId = requestAnimationFrame(loop)
		}

		if (videoLoopId) {
			cancelAnimationFrame(videoLoopId)
		}
		videoLoopId = requestAnimationFrame(loop)
	}

	const start = async (mode: "webcam" | "video" = "webcam") => {
		if (mode === "video") {
			return startVideoLoop()
		}

		return startWebcam()
	}

	const stopVideoLoop = () => {
		if (!videoLoopId) return
		cancelAnimationFrame(videoLoopId)
		videoLoopId = 0
	}

	const stop = () => {
		camera?.stop?.()
		camera = null
		stopVideoLoop()
		holistic.value?.close?.()
	}

	return {
		holistic,
		init,
		start,
		startWebcam,
		startVideoLoop,
		sendFrame,
		stop,
		setOnResults,
	}
}
