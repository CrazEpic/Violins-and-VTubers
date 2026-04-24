import * as THREE from "three/webgpu"
import { ref, type Ref } from "vue"

type PropId = "violin" | "bow"
type Axis = "x" | "y" | "z"

type Vec3State = Record<Axis, number>

type PropTransformState = {
	position: Vec3State
	rotationDeg: Vec3State
	scale: Vec3State
}

type PropCalibration = {
	position: Vec3State
	rotationDeg: Vec3State
	scale: Vec3State
	visible: boolean
}

type PropCalibrationMap = Record<PropId, PropCalibration>
type PropParentDefaultsMap = Record<PropId, PropTransformState>

type PropMeasurement = {
	sizeMeters: Vec3State
	zMeters: number
	zCm: number
}

export const usePropCalibration = (sceneRef: Ref<any>) => {
	const propParents = {
		violin: ref<THREE.Group | null>(null),
		bow: ref<THREE.Group | null>(null),
	}
	const propRoots = {
		violin: ref<THREE.Group | null>(null),
		bow: ref<THREE.Group | null>(null),
	}
	const propDiagnostics = ref<Record<PropId, { branchName: string; meshCount: number }>>({
		violin: { branchName: "", meshCount: 0 },
		bow: { branchName: "", meshCount: 0 },
	})

	const defaultTransformState = (): PropTransformState => ({
		position: { x: 0, y: 0, z: 0 },
		rotationDeg: { x: 0, y: 0, z: 0 },
		scale: { x: 1, y: 1, z: 1 },
	})

	const defaultPropCalibration = (): PropCalibrationMap => ({
		violin: {
			...defaultTransformState(),
			visible: true,
		},
		bow: {
			...defaultTransformState(),
			visible: true,
		},
	})

	const defaultPropParentDefaults = (): PropParentDefaultsMap => ({
		violin: defaultTransformState(),
		bow: defaultTransformState(),
	})

	const propCalibration = ref<PropCalibrationMap>(defaultPropCalibration())
	const propParentDefaults = ref<PropParentDefaultsMap>(defaultPropParentDefaults())

	const cloneCalibration = () => JSON.parse(JSON.stringify(propCalibration.value)) as PropCalibrationMap
	const cloneParentDefaults = () => JSON.parse(JSON.stringify(propParentDefaults.value)) as PropParentDefaultsMap

	const countMeshes = (root: THREE.Object3D) => {
		let count = 0
		root.traverse((obj) => {
			if ((obj as THREE.Mesh).isMesh) count++
		})
		return count
	}

	const getBranchCandidates = (root: THREE.Object3D): THREE.Object3D[] => {
		const direct = root.children.filter((child) => child.type !== "Bone")
		if (direct.length >= 2) return direct
		return root.children
	}

	const applyTransformState = (target: THREE.Object3D, state: PropTransformState) => {
		target.position.set(state.position.x, state.position.y, state.position.z)
		target.rotation.set(
			THREE.MathUtils.degToRad(state.rotationDeg.x),
			THREE.MathUtils.degToRad(state.rotationDeg.y),
			THREE.MathUtils.degToRad(state.rotationDeg.z),
		)
		target.scale.set(state.scale.x, state.scale.y, state.scale.z)
	}

	const applyParentTransform = (propId: PropId) => {
		const parent = propParents[propId].value
		if (!parent) return
		applyTransformState(parent, propParentDefaults.value[propId])
	}

	const applyPropTransform = (propId: PropId) => {
		const root = propRoots[propId].value
		if (!root) return

		const cfg = propCalibration.value[propId]
		applyTransformState(root, cfg)
		root.visible = cfg.visible
	}

	const splitViolinAndBow = (gltfScene: THREE.Object3D) => {
		const rootNode = gltfScene.getObjectByName("RootNode") ?? gltfScene
		const branches = getBranchCandidates(rootNode)
		if (!branches.length) return

		const sorted = [...branches]
			.map((node) => ({ node, meshCount: countMeshes(node) }))
			.sort((a, b) => b.meshCount - a.meshCount)

		const violinBranch = sorted[0]?.node ?? null
		const bowBranch = sorted[1]?.node ?? null
		if (!violinBranch || !bowBranch || !sceneRef.value) return

		const violinRoot = new THREE.Group()
		violinRoot.name = "ViolinRoot"
		const bowRoot = new THREE.Group()
		bowRoot.name = "BowRoot"
		const violinParent = new THREE.Group()
		violinParent.name = "ViolinParent"
		const bowParent = new THREE.Group()
		bowParent.name = "BowParent"

		sceneRef.value.add(violinParent)
		sceneRef.value.add(bowParent)
		violinParent.add(violinRoot)
		bowParent.add(bowRoot)
		violinRoot.attach(violinBranch)
		bowRoot.attach(bowBranch)

		propParents.violin.value = violinParent
		propParents.bow.value = bowParent
		propRoots.violin.value = violinRoot
		propRoots.bow.value = bowRoot

		propDiagnostics.value = {
			violin: { branchName: violinBranch.name || "(unnamed)", meshCount: countMeshes(violinBranch) },
			bow: { branchName: bowBranch.name || "(unnamed)", meshCount: countMeshes(bowBranch) },
		}

		applyParentTransform("violin")
		applyParentTransform("bow")
		applyPropTransform("violin")
		applyPropTransform("bow")
	}

	const setPropCalibration = (propId: PropId, calibration: Partial<PropCalibration>) => {
		const current = propCalibration.value[propId]
		propCalibration.value[propId] = {
			position: { ...current.position, ...(calibration.position ?? {}) },
			rotationDeg: { ...current.rotationDeg, ...(calibration.rotationDeg ?? {}) },
			scale: { ...current.scale, ...(calibration.scale ?? {}) },
			visible: calibration.visible ?? current.visible,
		}
		applyPropTransform(propId)
	}

	const setPropParentDefaults = (propId: PropId, defaults: Partial<PropTransformState>) => {
		const current = propParentDefaults.value[propId]
		propParentDefaults.value[propId] = {
			position: { ...current.position, ...(defaults.position ?? {}) },
			rotationDeg: { ...current.rotationDeg, ...(defaults.rotationDeg ?? {}) },
			scale: { ...current.scale, ...(defaults.scale ?? {}) },
		}
		applyParentTransform(propId)
	}

	const getPropCalibration = () => cloneCalibration()
	const getPropParentDefaults = () => cloneParentDefaults()

	const resetPropParentDefaults = (propId?: PropId) => {
		const defaults = defaultPropParentDefaults()
		if (propId) {
			propParentDefaults.value[propId] = defaults[propId]
			applyParentTransform(propId)
			return
		}

		propParentDefaults.value = defaults
		applyParentTransform("violin")
		applyParentTransform("bow")
	}

	const resetPropCalibration = (propId?: PropId) => {
		const defaults = defaultPropCalibration()
		if (propId) {
			propCalibration.value[propId] = defaults[propId]
			applyPropTransform(propId)
			return
		}

		propCalibration.value = defaults
		applyPropTransform("violin")
		applyPropTransform("bow")
	}

	const bakeCalibrationIntoParentDefaults = (propId: PropId) => {
		const parentDefaults = propParentDefaults.value[propId]
		const currentCalibration = propCalibration.value[propId]

		setPropParentDefaults(propId, {
			position: {
				x: parentDefaults.position.x + currentCalibration.position.x,
				y: parentDefaults.position.y + currentCalibration.position.y,
				z: parentDefaults.position.z + currentCalibration.position.z,
			},
			rotationDeg: {
				x: parentDefaults.rotationDeg.x + currentCalibration.rotationDeg.x,
				y: parentDefaults.rotationDeg.y + currentCalibration.rotationDeg.y,
				z: parentDefaults.rotationDeg.z + currentCalibration.rotationDeg.z,
			},
			scale: {
				x: parentDefaults.scale.x * currentCalibration.scale.x,
				y: parentDefaults.scale.y * currentCalibration.scale.y,
				z: parentDefaults.scale.z * currentCalibration.scale.z,
			},
		})

		resetPropCalibration(propId)
	}

	const getPropMeasurement = (propId: PropId): PropMeasurement | null => {
		const target = propRoots[propId].value
		if (!target) return null

		const box = new THREE.Box3().setFromObject(target)
		if (box.isEmpty()) {
			return {
				sizeMeters: { x: 0, y: 0, z: 0 },
				zMeters: 0,
				zCm: 0,
			}
		}

		const size = new THREE.Vector3()
		box.getSize(size)

		return {
			sizeMeters: { x: size.x, y: size.y, z: size.z },
			zMeters: size.z,
			zCm: size.z * 100,
		}
	}

	const fitPropZLengthCm = (propId: PropId, targetCm: number) => {
		if (!Number.isFinite(targetCm) || targetCm <= 0) return
		const measurement = getPropMeasurement(propId)
		if (!measurement || measurement.zMeters <= 1e-6) return

		const factor = (targetCm / 100) / measurement.zMeters
		const current = propCalibration.value[propId]
		setPropCalibration(propId, {
			scale: {
				x: current.scale.x * factor,
				y: current.scale.y * factor,
				z: current.scale.z * factor,
			},
		})
	}

	const exportPropCalibration = () =>
		JSON.stringify(
			{
				calibration: propCalibration.value,
				parentDefaults: propParentDefaults.value,
			},
			null,
			2,
		)

	const importPropCalibration = (rawJson: string) => {
		const parsed = JSON.parse(rawJson) as
			| Partial<PropCalibrationMap>
			| {
					calibration?: Partial<PropCalibrationMap>
					parentDefaults?: Partial<PropParentDefaultsMap>
			  }

		if ("calibration" in parsed || "parentDefaults" in parsed) {
			if (parsed.parentDefaults?.violin) setPropParentDefaults("violin", parsed.parentDefaults.violin)
			if (parsed.parentDefaults?.bow) setPropParentDefaults("bow", parsed.parentDefaults.bow)
			if (parsed.calibration?.violin) setPropCalibration("violin", parsed.calibration.violin)
			if (parsed.calibration?.bow) setPropCalibration("bow", parsed.calibration.bow)
			return
		}

		const legacy = parsed as Partial<PropCalibrationMap>
		if (legacy.violin) setPropCalibration("violin", legacy.violin)
		if (legacy.bow) setPropCalibration("bow", legacy.bow)
	}

	const getPropDiagnostics = () => propDiagnostics.value

	const dispose = () => {
		propParents.violin.value = null
		propParents.bow.value = null
		propRoots.violin.value = null
		propRoots.bow.value = null
	}

	return {
		splitViolinAndBow,
		setPropCalibration,
		setPropParentDefaults,
		getPropCalibration,
		getPropParentDefaults,
		resetPropCalibration,
		resetPropParentDefaults,
		bakeCalibrationIntoParentDefaults,
		getPropMeasurement,
		fitPropZLengthCm,
		exportPropCalibration,
		importPropCalibration,
		getPropDiagnostics,
		dispose,
	}
}