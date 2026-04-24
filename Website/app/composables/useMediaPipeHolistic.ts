import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils"
import { FACEMESH_TESSELATION, HAND_CONNECTIONS, Holistic, POSE_CONNECTIONS, type Results } from "@mediapipe/holistic"
import { Camera } from "@mediapipe/camera_utils"

export const useMediaPipeHolistic = (videoRef: any, guideCanvasRef?: any) => {
	const holistic = shallowRef<Holistic | null>(null)
	let camera: Camera | null = null

	let onResultsCallback: ((results: Results) => void) | null = null

	const setOnResults = (callback: (results: Results) => void) => {
		onResultsCallback = callback
	}

	const drawResults = (results: Results) => {
		if (!videoRef.value || !guideCanvasRef?.value) {
			return
		}

		guideCanvasRef.value.width = videoRef.value.videoWidth
		guideCanvasRef.value.height = videoRef.value.videoHeight

		const canvasCtx = guideCanvasRef.value.getContext("2d")
		if (!canvasCtx) {
			return
		}

		canvasCtx.save()
		canvasCtx.clearRect(0, 0, guideCanvasRef.value.width, guideCanvasRef.value.height)

		drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
			color: "#00cff7",
			lineWidth: 4,
		})
		drawLandmarks(canvasCtx, results.poseLandmarks, {
			color: "#ff0364",
			lineWidth: 2,
		})

		drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
			color: "#C0C0C070",
			lineWidth: 1,
		})

		if (results.faceLandmarks && results.faceLandmarks.length === 478) {
			const leftIris = results.faceLandmarks[468]
			const rightIris = results.faceLandmarks[473]
			if (leftIris && rightIris) {
				drawLandmarks(canvasCtx, [leftIris, rightIris], {
					color: "#ffe603",
					lineWidth: 2,
				})
			}
		}

		drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
			color: "#eb1064",
			lineWidth: 5,
		})
		drawLandmarks(canvasCtx, results.leftHandLandmarks, {
			color: "#00cff7",
			lineWidth: 2,
		})

		drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
			color: "#22c3e3",
			lineWidth: 5,
		})
		drawLandmarks(canvasCtx, results.rightHandLandmarks, {
			color: "#ff0364",
			lineWidth: 2,
		})

		canvasCtx.restore()
	}

	const init = async (baseUrl: string) => {
		holistic.value = new Holistic({
			locateFile: (file) => `${baseUrl}mediapipe/holistic/${file}`,
		})

		holistic.value.setOptions({
			modelComplexity: 0,
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

	const start = async () => {
		if (!videoRef.value) return

		camera = new Camera(videoRef.value, {
			width: 640,
			height: 480,
			onFrame: async () => {
				if (holistic.value && videoRef.value) {
					await holistic.value.send({ image: videoRef.value })
				}
			},
		})

		camera.start()
	}

	const stop = () => {
		camera?.stop?.()
		holistic.value?.close?.()
	}

	return {
		holistic,
		init,
		start,
		stop,
		setOnResults,
	}
}
