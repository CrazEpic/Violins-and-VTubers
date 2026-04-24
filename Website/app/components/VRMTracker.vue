<template>
	<div class="tracker-page">
		<div ref="rendererHost" class="renderer-host" />

		<div class="absolute right-4 top-4 z-40">
			<UButton
				icon="i-lucide-log-out"
				color="red"
				variant="outline"
				@click="$emit('quit')"
			>
				Quit
			</UButton>
		</div>

		<div v-if="isLoading" class="loading-overlay">
			<div class="loading-container">
				<h1 class="loading-title">Loading VRM Tracker</h1>
				
				<div class="progress-bar">
					<div class="progress-fill" :style="{ width: `${loadingProgress}%` }" />
				</div>
				<p class="progress-text">{{ loadingProgress }}%</p>

				<div class="loading-steps">
					<div 
						v-for="(step, index) in loadingSteps" 
						:key="index"
						class="step"
						:class="{ active: index === currentStep, completed: index < currentStep }"
					>
						<div class="step-icon">
							<span v-if="index < currentStep" class="icon-check">✓</span>
							<span v-else-if="index === currentStep" class="icon-spinner">⊙</span>
							<span v-else class="icon-pending">○</span>
						</div>
						<span class="step-name">{{ step }}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="preview">
			<video ref="videoElement" class="input-video" autoplay muted playsinline />
			<canvas ref="guideCanvas" class="guides" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
// import * as THREE from "three"
import * as THREE from 'three/webgpu';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRM, VRMExpressionPresetName, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm"
import { FACEMESH_TESSELATION, HAND_CONNECTIONS, Holistic, POSE_CONNECTIONS, type Results } from "@mediapipe/holistic"
import { Camera } from "@mediapipe/camera_utils"
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils"
import * as Kalidokit from "kalidokit"

interface Props {
	modelPath: string
}

const props = defineProps<Props>()
defineEmits<{
	quit: []
}>()

const rendererHost = ref<HTMLDivElement | null>(null)
const videoElement = ref<HTMLVideoElement | null>(null)
const guideCanvas = ref<HTMLCanvasElement | null>(null)

const isLoading = ref(true)
const loadingProgress = ref(0)
const currentStep = ref(0)
const loadingSteps = [
	"Initializing scene",
	"Loading 3D model",
	"Setting up MediaPipe",
	"Starting camera",
	"Ready!"
]

let currentVrm: VRM | null = null
let renderer: THREE.WebGPURenderer | null = null
let orbitCamera: THREE.PerspectiveCamera | null = null
let orbitControls: OrbitControls | null = null
let scene: THREE.Scene | null = null
let clock: THREE.Clock | null = null
let animationFrameId = 0
let holistic: Holistic | null = null
let mediapipeCamera: Camera | null = null

const oldLookTarget = new THREE.Euler()

const lerp = Kalidokit.Vector.lerp
const clamp = Kalidokit.Utils.clamp

type BoneName = keyof typeof VRMHumanBoneName

const rigRotation = (name: BoneName, rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
	if (!currentVrm) {
		return
	}

	const part = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName[name])
	if (!part) {
		return
	}

	const euler = new THREE.Euler(rotation.x * dampener, rotation.y * dampener, rotation.z * dampener)
	const quaternion = new THREE.Quaternion().setFromEuler(euler)
	part.quaternion.slerp(quaternion, lerpAmount)
}

const rigPosition = (name: BoneName, position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3) => {
	if (!currentVrm) {
		return
	}

	const part = currentVrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName[name])
	if (!part) {
		return
	}

	const vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener)
	part.position.lerp(vector, lerpAmount)
}

const getExpressionValue = (name: string) => currentVrm?.expressionManager?.getValue(name) ?? 0

const setExpressionValue = (name: string, value: number) => {
	currentVrm?.expressionManager?.setValue(name, value)
}

const rigFace = (riggedFace: any) => {
	if (!currentVrm) {
		return
	}

	rigRotation("Neck", riggedFace.head, 0.7)

	riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1), getExpressionValue(VRMExpressionPresetName.Blink), 0.5)
	riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1), getExpressionValue(VRMExpressionPresetName.Blink), 0.5)
	riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y)
	setExpressionValue(VRMExpressionPresetName.Blink, riggedFace.eye.l)

	setExpressionValue(VRMExpressionPresetName.Ih, lerp(riggedFace.mouth.shape.I, getExpressionValue(VRMExpressionPresetName.Ih), 0.5))
	setExpressionValue(VRMExpressionPresetName.Aa, lerp(riggedFace.mouth.shape.A, getExpressionValue(VRMExpressionPresetName.Aa), 0.5))
	setExpressionValue(VRMExpressionPresetName.Ee, lerp(riggedFace.mouth.shape.E, getExpressionValue(VRMExpressionPresetName.Ee), 0.5))
	setExpressionValue(VRMExpressionPresetName.Oh, lerp(riggedFace.mouth.shape.O, getExpressionValue(VRMExpressionPresetName.Oh), 0.5))
	setExpressionValue(VRMExpressionPresetName.Ou, lerp(riggedFace.mouth.shape.U, getExpressionValue(VRMExpressionPresetName.Ou), 0.5))

	const lookTarget = new THREE.Euler(lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4), lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4), 0, "XYZ")
	oldLookTarget.copy(lookTarget)

	// currentVrm.lookAt?.applier.lookAt(lookTarget)
	currentVrm.lookAt?.applier.applyYawPitch(lookTarget.y, lookTarget.x)
}

const animateVRM = (results: Results) => {
	if (!currentVrm || !videoElement.value) {
		return
	}

	let riggedPose: any
	let riggedLeftHand: any
	let riggedRightHand: any

	const faceLandmarks = results.faceLandmarks
	const pose3DLandmarks = (results as any).za
	const pose2DLandmarks = results.poseLandmarks
	const leftHandLandmarks = results.rightHandLandmarks
	const rightHandLandmarks = results.leftHandLandmarks

	if (faceLandmarks) {
		const riggedFace = Kalidokit.Face.solve(faceLandmarks, {
			runtime: "mediapipe",
			video: videoElement.value,
		})
		rigFace(riggedFace)
	}

	if (pose2DLandmarks && pose3DLandmarks) {
		riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
			runtime: "mediapipe",
			video: videoElement.value,
		})

		rigRotation("Hips", riggedPose.Hips.rotation, 0.7)
		rigPosition(
			"Hips",
			{
				x: -riggedPose.Hips.position.x,
				y: riggedPose.Hips.position.y + 1,
				z: -riggedPose.Hips.position.z,
			},
			1,
			0.07
		)

		rigRotation("Chest", riggedPose.Spine, 0.25, 0.3)
		rigRotation("Spine", riggedPose.Spine, 0.45, 0.3)

		rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, 0.3)
		rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, 0.3)
		rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, 1, 0.3)
		rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, 1, 0.3)

		rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, 0.3)
		rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, 0.3)
		rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, 0.3)
		rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, 0.3)
	}

	if (leftHandLandmarks && riggedPose) {
		riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left")
		rigRotation("LeftHand", {
			z: riggedPose.LeftHand.z,
			y: riggedLeftHand.LeftWrist.y,
			x: riggedLeftHand.LeftWrist.x,
		})

		rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal)
		rigRotation("LeftRingIntermediate", riggedLeftHand.LeftRingIntermediate)
		rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal)
		rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal)
		rigRotation("LeftIndexIntermediate", riggedLeftHand.LeftIndexIntermediate)
		rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal)
		rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal)
		rigRotation("LeftMiddleIntermediate", riggedLeftHand.LeftMiddleIntermediate)
		rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal)
		rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal)
		rigRotation("LeftThumbIntermediate", riggedLeftHand.LeftThumbIntermediate)
		rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal)
		rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal)
		rigRotation("LeftLittleIntermediate", riggedLeftHand.LeftLittleIntermediate)
		rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal)
	}

	if (rightHandLandmarks && riggedPose) {
		riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right")
		rigRotation("RightHand", {
			z: riggedPose.RightHand.z,
			y: riggedRightHand.RightWrist.y,
			x: riggedRightHand.RightWrist.x,
		})

		rigRotation("RightRingProximal", riggedRightHand.RightRingProximal)
		rigRotation("RightRingIntermediate", riggedRightHand.RightRingIntermediate)
		rigRotation("RightRingDistal", riggedRightHand.RightRingDistal)
		rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal)
		rigRotation("RightIndexIntermediate", riggedRightHand.RightIndexIntermediate)
		rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal)
		rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal)
		rigRotation("RightMiddleIntermediate", riggedRightHand.RightMiddleIntermediate)
		rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal)
		rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal)
		rigRotation("RightThumbIntermediate", riggedRightHand.RightThumbIntermediate)
		rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal)
		rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal)
		rigRotation("RightLittleIntermediate", riggedRightHand.RightLittleIntermediate)
		rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal)
	}
}

const drawResults = (results: Results) => {
	if (!videoElement.value || !guideCanvas.value) {
		return
	}

	guideCanvas.value.width = videoElement.value.videoWidth
	guideCanvas.value.height = videoElement.value.videoHeight

	const canvasCtx = guideCanvas.value.getContext("2d")
	if (!canvasCtx) {
		return
	}

	canvasCtx.save()
	canvasCtx.clearRect(0, 0, guideCanvas.value.width, guideCanvas.value.height)

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
		drawLandmarks(canvasCtx, [results.faceLandmarks[468], results.faceLandmarks[473]], {
			color: "#ffe603",
			lineWidth: 2,
		})
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

const onResize = () => {
	if (!renderer || !orbitCamera || !rendererHost.value) {
		return
	}

	const width = rendererHost.value.clientWidth
	const height = rendererHost.value.clientHeight

	orbitCamera.aspect = width / Math.max(height, 1)
	orbitCamera.updateProjectionMatrix()
	renderer.setSize(width, height)
	renderer.setPixelRatio(window.devicePixelRatio)
}

onMounted(async () => {
	if (!rendererHost.value || !videoElement.value || !guideCanvas.value) {
		return
	}

	// Step 0: Initializing scene
	currentStep.value = 0
	loadingProgress.value = 10

	scene = new THREE.Scene()
	clock = new THREE.Clock()

	renderer = new THREE.WebGPURenderer({ alpha: true, antialias: true })
	await renderer.init();
	rendererHost.value.appendChild(renderer.domElement)

	orbitCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000)
	orbitCamera.position.set(0, 1.4, 0.7)

	orbitControls = new OrbitControls(orbitCamera, renderer.domElement)
	orbitControls.screenSpacePanning = true
	orbitControls.target.set(0, 1.4, 0)
	orbitControls.update()

	const light = new THREE.DirectionalLight(0xffffff)
	light.position.set(1, 1, 1).normalize()
	scene.add(light)

	onResize()
	window.addEventListener("resize", onResize)

	// Step 1: Loading 3D model
	currentStep.value = 1
	loadingProgress.value = 25

	const loader = new GLTFLoader()
	loader.crossOrigin = "anonymous"
	loader.register((parser) => new VRMLoaderPlugin(parser))

	const runtimeConfig = useRuntimeConfig()
	const base = runtimeConfig.app.baseURL || "/"
	const modelUrl = `${base}${props.modelPath}`

	loader.load(
		modelUrl,
		(gltf) => {
			const vrm = gltf.userData.vrm as VRM
			if (!vrm || !scene) {
				return
			}

			VRMUtils.removeUnnecessaryVertices(gltf.scene)
			VRMUtils.removeUnnecessaryJoints(gltf.scene)
			scene.add(vrm.scene)

			currentVrm = vrm
			currentVrm.scene.rotation.y = Math.PI
			
			loadingProgress.value = 40
		},
		undefined,
		(error) => {
			console.error(error)
		}
	)

	const renderLoop = () => {
		animationFrameId = window.requestAnimationFrame(renderLoop)

		if (currentVrm && clock) {
			currentVrm.update(clock.getDelta())
		}

		if (renderer && scene && orbitCamera) {
			renderer.render(scene, orbitCamera)
		}
	}
	renderLoop()

	// Step 2: Setting up MediaPipe
	currentStep.value = 2
	loadingProgress.value = 55

	holistic = new Holistic({
		locateFile: (file) => `${base}mediapipe/holistic/${file}`,
	})

	holistic.setOptions({
		modelComplexity: 0,
		smoothLandmarks: true,
		minDetectionConfidence: 0.7,
		minTrackingConfidence: 0.7,
		refineFaceLandmarks: true,
	})

	holistic.onResults((results) => {
		drawResults(results)
		animateVRM(results)
	})

	loadingProgress.value = 70

	// Step 3: Starting camera
	currentStep.value = 3
	loadingProgress.value = 85

	mediapipeCamera = new Camera(videoElement.value, {
		onFrame: async () => {
			if (holistic && videoElement.value) {
				await holistic.send({ image: videoElement.value })
			}
		},
		width: 640,
		height: 480,
	})

	mediapipeCamera.start()

	// Step 4: Ready
	currentStep.value = 4
	loadingProgress.value = 100
	
	// Small delay to show "Ready!" state before hiding
	await new Promise(resolve => setTimeout(resolve, 500))
	isLoading.value = false
})

onUnmounted(() => {
	window.removeEventListener("resize", onResize)

	if (animationFrameId) {
		window.cancelAnimationFrame(animationFrameId)
	}

	if (renderer) {
		renderer.dispose()
		if (renderer.domElement.parentNode) {
			renderer.domElement.parentNode.removeChild(renderer.domElement)
		}
	}

	orbitControls?.dispose()
	currentVrm = null

	if (holistic) {
		void holistic.close()
	}

	if (mediapipeCamera && "stop" in mediapipeCamera) {
		;(mediapipeCamera as Camera & { stop: () => void }).stop()
	}
})
</script>

<style scoped>
.tracker-page {
	position: relative;
	width: 100%;
	height: 100vh;
	overflow: hidden;
	background: #05070d;
}

.renderer-host {
	width: 100%;
	height: 100%;
}

.loading-overlay {
	position: fixed;
	inset: 0;
	background: rgba(5, 7, 13, 0.95);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 50;
	backdrop-filter: blur(4px);
}

.loading-container {
	text-align: center;
	max-width: 400px;
	padding: 2rem;
}

.loading-title {
	font-size: 1.875rem;
	font-weight: 600;
	color: #ffffff;
	margin-bottom: 2rem;
	letter-spacing: -0.015em;
}

.progress-bar {
	width: 100%;
	height: 4px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 2px;
	overflow: hidden;
	margin-bottom: 0.75rem;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, #00cff7 0%, #0ea5e9 100%);
	transition: width 0.3s ease;
	box-shadow: 0 0 10px rgba(0, 207, 247, 0.5);
}

.progress-text {
	font-size: 0.875rem;
	color: #94a3b8;
	margin-bottom: 2rem;
	font-variant-numeric: tabular-nums;
}

.loading-steps {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	text-align: left;
}

.step {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem;
	border-radius: 0.5rem;
	background: rgba(255, 255, 255, 0.02);
	transition: all 0.3s ease;
}

.step.completed {
	opacity: 0.6;
}

.step.active {
	background: rgba(0, 207, 247, 0.1);
	border-left: 2px solid #00cff7;
	padding-left: calc(0.75rem - 2px);
}

.step-icon {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.875rem;
	flex-shrink: 0;
	min-width: 24px;
}

.icon-check {
	color: #10b981;
	font-weight: bold;
}

.icon-spinner {
	color: #00cff7;
	animation: spin 1s linear infinite;
}

.icon-pending {
	color: #64748b;
}

.step-name {
	color: #e2e8f0;
	font-size: 0.875rem;
	font-weight: 500;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.preview {
	position: absolute;
	right: 1rem;
	bottom: 1rem;
	width: 320px;
	border-radius: 10px;
	overflow: hidden;
	background: #111;
	border: 1px solid #ffffff26;
}

.input-video,
.guides {
	width: 100%;
	display: block;
	height: auto;
	transform: scale(-1, 1);
}

.guides {
	position: absolute;
	inset: 0;
}

@media (max-width: 640px) {
	.preview {
		width: 180px;
	}

	.loading-container {
		padding: 1.5rem;
	}

	.loading-title {
		font-size: 1.5rem;
		margin-bottom: 1.5rem;
	}
}
</style>
