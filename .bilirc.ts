import { Config as Configuration } from "bili";

const configuration: Configuration = {
	banner: false,
	input: "src/index.ts",
	output: {
		format: ["es", "cjs", "umd", "umd-min"],
		moduleName: "HermesHttp",
		dir: "dist",
	},
	plugins: {
		typescript2: {
			clean: true,
			tsconfig: "./tsconfig.build.json",
			useTsconfigDeclarationDir: true,
		},
	},
};

export default configuration;
