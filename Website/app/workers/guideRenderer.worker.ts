type Landmark = {
	x: number
	y: number
	z?: number
	visibility?: number
}

type Connection = [number, number]

type InitMessage = {
	type: "init"
	canvas: OffscreenCanvas
	connections: {
		pose: Connection[]
		face: Connection[]
		hand: Connection[]
	}
}

type DrawMessage = {
	type: "draw"
	width: number
	height: number
	poseLandmarks: Landmark[] | null
	faceLandmarks: Landmark[] | null
	leftHandLandmarks: Landmark[] | null
	rightHandLandmarks: Landmark[] | null
}

let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let poseConnections: Connection[] = []
let faceConnections: Connection[] = []
let handConnections: Connection[] = []

const drawLandmarks = (landmarks: Landmark[] | null, color: string, radius = 2) => {
	if (!ctx || !canvas || !landmarks) {
		return
	}

	ctx.fillStyle = color
	for (const lm of landmarks) {
		ctx.beginPath()
		ctx.arc(lm.x * canvas.width, lm.y * canvas.height, radius, 0, Math.PI * 2)
		ctx.fill()
	}
}

const drawConnectors = (landmarks: Landmark[] | null, connections: Connection[], color: string, lineWidth: number) => {
	if (!ctx || !canvas || !landmarks) {
		return
	}

	ctx.strokeStyle = color
	ctx.lineWidth = lineWidth
	ctx.beginPath()

	for (const [startIndex, endIndex] of connections) {
		const start = landmarks[startIndex]
		const end = landmarks[endIndex]
		if (!start || !end) {
			continue
		}

		ctx.moveTo(start.x * canvas.width, start.y * canvas.height)
		ctx.lineTo(end.x * canvas.width, end.y * canvas.height)
	}

	ctx.stroke()
}

self.onmessage = (event: MessageEvent<InitMessage | DrawMessage>) => {
	const message = event.data

	if (message.type === "init") {
		canvas = message.canvas
		ctx = canvas.getContext("2d")
		poseConnections = message.connections.pose
		faceConnections = message.connections.face
		handConnections = message.connections.hand
		return
	}

	if (!canvas || !ctx) {
		return
	}

	canvas.width = message.width
	canvas.height = message.height

	ctx.clearRect(0, 0, canvas.width, canvas.height)

	drawConnectors(message.poseLandmarks, poseConnections, "#00cff7", 4)
	drawLandmarks(message.poseLandmarks, "#ff0364", 2)

	drawConnectors(message.faceLandmarks, faceConnections, "#C0C0C070", 1)

	if (message.faceLandmarks && message.faceLandmarks.length > 473) {
		drawLandmarks([message.faceLandmarks[468], message.faceLandmarks[473]], "#ffe603", 2)
	}

	drawConnectors(message.leftHandLandmarks, handConnections, "#eb1064", 5)
	drawLandmarks(message.leftHandLandmarks, "#00cff7", 2)

	drawConnectors(message.rightHandLandmarks, handConnections, "#22c3e3", 5)
	drawLandmarks(message.rightHandLandmarks, "#ff0364", 2)
}
