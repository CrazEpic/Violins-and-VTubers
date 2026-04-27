// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/ui"],
	devtools: { enabled: true },
	css: ["~/assets/css/main.css"],
	app: {
		baseURL: "/TBD-CV",
	},
	vite: {
		optimizeDeps: {
			include: [
				"@vue/devtools-core",
				"@vue/devtools-kit",
				"three",
				"three/examples/jsm/controls/OrbitControls.js",
				"three/examples/jsm/loaders/GLTFLoader.js",
				"@pixiv/three-vrm",
				"@mediapipe/holistic", // CJS
				"@mediapipe/camera_utils", // CJS
				"@mediapipe/drawing_utils", // CJS
				"three/webgpu",
			],
		},
	},
})
