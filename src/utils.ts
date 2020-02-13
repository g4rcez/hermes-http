type ArrayEncode = "index" | "brackets" | "commas";

export type QueryString<T extends string> = { [key in keyof T]: T[key] };

type Options = Partial<{
	array: ArrayEncode;
	strict: boolean;
	encode: boolean;
}>;

export const qsEmpty = (object: unknown) => {
	if (typeof object === "undefined" || object === null) {
		return true;
	}
	return Object.keys(object as any).length > 0;
};

export const concatUrl = (base: string, uri: string) => (uri ? `${base.replace(/\/+$/, "")}/${uri.replace(/^\/+/, "")}` : base);

const strictEncode = (str: string) =>
	encodeURIComponent(str).replace(
		new RegExp("[!'()*]", "g"),
		(x) =>
			`%${x
				.charCodeAt(0)
				.toString(16)
				.toUpperCase()}`
	);

const encode = (value: string | number, options: Options) => {
	if (options.encode) {
		return options.strict ? strictEncode(`${value}`) : encodeURIComponent(value);
	}
	return `${value}`;
};

const encodeTypes: {
	[key in ArrayEncode]: any;
} = {
	index: (key: string, options: Options) => (result: string[], value: string) => {
		const index = result.length;
		if (value === undefined || value === null) {
			return result;
		}
		return [...result, [encode(key, options), "[", encode(index, options), "]=", encode(value, options)].join("")];
	},
	brackets: (key: string, options: Options) => (result: string[], value: string) => {
		if (value === undefined || value === null) {
			return result;
		}
		return [...result, [encode(key, options), "[]=", encode(value, options)].join("")];
	},
	commas: (key: string, options: Options) => (result: string[], value: string) => {
		if (value === null || value === undefined || value.length === 0) {
			return result;
		}
		if (result.length === 0) {
			return [[encode(key, options), "=", encode(value, options)].join("")];
		}
		return [[result, encode(value, options)].join(",")];
	}
};

export const encodeArray = (type: ArrayEncode = "commas") => encodeTypes[type];

export const qs = <T extends string>(params: QueryString<T>, options: Options = { array: "commas" as ArrayEncode, encode: true, strict: true }) => {
	if (!!!params) {
		return "";
	}

	const objectNonNull = Object.entries(params).reduce(
		(acc, [key, value]) => (params[key] !== undefined || params[key] !== null ? { ...acc, [key]: value } : acc),
		{}
	);

	return Object.entries(objectNonNull)
		.map(
			([key, val]: [string, string]) =>
				Array.isArray(val)
					? val.reduce(encodeArray(options.array)(key, options), []).join("&")
					: encode(key, options) + "=" + encode(val, options),
			""
		)
		.filter((x) => x.length > 0)
		.join("&");
};
