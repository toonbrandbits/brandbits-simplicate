import react from "@vitejs/plugin-react";
import "dotenv/config";
import path from "node:path";
import { defineConfig, splitVendorChunkPlugin } from "vite";
import injectHTML from "vite-plugin-html-inject";
import tsConfigPaths from "vite-tsconfig-paths";

type Extension = {
	name: string;
	version: string;
	config: Record<string, unknown>;
};

enum ExtensionName {
	FIREBASE_AUTH = "firebase-auth",
	STACK_AUTH = "stack-auth"
}

const listExtensions = (): Extension[] => {
	if (process.env.DATABUTTON_EXTENSIONS) {
		try {
			return JSON.parse(process.env.DATABUTTON_EXTENSIONS) as Extension[];
		} catch (err: unknown) {
			console.error("Error parsing DATABUTTON_EXTENSIONS", err);
			console.error(process.env.DATABUTTON_EXTENSIONS);
			return [];
		}
	}

	return [];
};

const extensions = listExtensions();

const getExtensionConfig = (name: string): string => {
	const extension = extensions.find((it) => it.name === name);

	if (!extension) {
		console.warn(`Extension ${name} not found`);
	}

	return JSON.stringify(extension?.config);
};

// Custom StackAuth configuration for your own account
const getCustomStackAuthConfig = (): string => {
	// Check if custom StackAuth environment variables are set
	const customConfig = {
		projectId: process.env.STACK_AUTH_PROJECT_ID || "",
		jwksUrl: process.env.STACK_AUTH_JWKS_URL || "",
		publishableClientKey: process.env.STACK_AUTH_PUBLISHABLE_CLIENT_KEY || "",
		handlerUrl: process.env.STACK_AUTH_HANDLER_URL || "auth"
	};

	// If custom config is provided, use it; otherwise fall back to Databutton's config
	if (customConfig.projectId && customConfig.jwksUrl && customConfig.publishableClientKey) {
		console.log("Using custom StackAuth configuration");
		return JSON.stringify(customConfig);
	}

	// Fall back to Databutton's StackAuth config
	const databuttonConfig = getExtensionConfig(ExtensionName.STACK_AUTH);
	if (databuttonConfig !== "undefined") {
		console.log("Using Databutton StackAuth configuration");
		return databuttonConfig;
	}

	// Return empty config if neither is available
	console.warn("No StackAuth configuration found");
	return JSON.stringify({
		projectId: "",
		jwksUrl: "",
		publishableClientKey: "",
		handlerUrl: "auth"
	});
};

const buildVariables = () => {
	const appId = process.env.DATABUTTON_PROJECT_ID;

	const defines: Record<string, string> = {
		__APP_ID__: JSON.stringify(appId),
		__API_PATH__: JSON.stringify(""),
		__API_HOST__: JSON.stringify("brandbits-simplicate-backend.onrender.com"),
		__API_PREFIX_PATH__: JSON.stringify(""),
		__API_URL__: JSON.stringify("https://brandbits-simplicate-backend.onrender.com"),
		__WS_API_URL__: JSON.stringify("wss://brandbits-simplicate-backend.onrender.com"),
		__APP_BASE_PATH__: JSON.stringify("/"),
		__APP_TITLE__: JSON.stringify("Databutton"),
		__APP_FAVICON_LIGHT__: JSON.stringify("/favicon-light.svg"),
		__APP_FAVICON_DARK__: JSON.stringify("/favicon-dark.svg"),
		__APP_DEPLOY_USERNAME__: JSON.stringify(""),
		__APP_DEPLOY_APPNAME__: JSON.stringify(""),
		__APP_DEPLOY_CUSTOM_DOMAIN__: JSON.stringify(""),
		__STACK_AUTH_CONFIG__: JSON.stringify(getCustomStackAuthConfig()),
		__FIREBASE_CONFIG__: JSON.stringify(
			getExtensionConfig(ExtensionName.FIREBASE_AUTH),
		),
	};

	return defines;
};

// https://vite.dev/config/
export default defineConfig({
	define: buildVariables(),
	plugins: [react(), splitVendorChunkPlugin(), tsConfigPaths(), injectHTML()],
	build: {
		outDir: "dist",
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
	server: {
		proxy: {
			"/routes": {
				target: "http://127.0.0.1:8000",
				changeOrigin: true,
			},
		},
	},
	resolve: {
		alias: {
			resolve: {
				alias: {
					"@": path.resolve(__dirname, "./src"),
				},
			},
		},
	},
});
