export const isEmpty = (object: unknown) => {
	if (typeof object === "undefined" || object === null) {
		return true;
	}
	if (Array.isArray(object) && object.length === 0) {
		return true;
	}
	if (typeof object === "string" && object.trim().length === 0) {
		return true;
	}
	return Object.keys(object as any).length > 0;
};

export const resolveUrl = (base: string, uri: string) => (uri ? `${base.replace(/\/+$/, "")}/${uri.replace(/^\/+/, "")}` : base);

const strictEncode = (str: string) =>
	encodeURIComponent(str).replace(
		new RegExp("[!'()*]", "g"),
		(x) =>
			`%${x
				.charCodeAt(0)
				.toString(16)
				.toUpperCase()}`
	);

type ArrayEncode = "index" | "brackets" | "commas";

type Options = Partial<{
	array: ArrayEncode;
	strict: boolean;
	encode: boolean;
}>;

const encode = (value: string | number, options: Options) => {
	if (options.encode) {
		return options.strict ? strictEncode(`${value}`) : encodeURIComponent(value);
	}
	return `${value}`;
};

export const encodeArray = ({ array = "commas", ...options }: Options) => {
	if (array === "index") {
		return (key: string) => (result: string[], value: string) => {
			const index = result.length;
			if (value === undefined || value === null) {
				return result;
			}
			return [...result, [encode(key, options), "[", encode(index, options), "]=", encode(value, options)].join("")];
		};
	}
	if (array === "brackets") {
		return (key: string) => (result: string[], value: string) => {
			if (value === undefined || value === null) {
				return result;
			}
			return [...result, [encode(key, options), "[]=", encode(value, options)].join("")];
		};
	}
	if (array === "commas") {
		return (key: string) => (result: string[], value: string) => {
			if (value === null || value === undefined || value.length === 0) {
				return result;
			}
			if (result.length === 0) {
				return [[encode(key, options), "=", encode(value, options)].join("")];
			}
			return [[result, encode(value, options)].join(",")];
		};
	}
	return (key: string) => (result: string[], value: string) =>
		value === undefined || value === null ? result : [...result, [encode(key, options), "=", encode(value, options)].join("")];
};

type QueryString = { [key: string]: unknown };

const defaultOptions = { array: "commas" as ArrayEncode, encode: true, strict: true };

export const queryString = (params: QueryString, options: Options = defaultOptions) => {
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
				Array.isArray(val) ? val.reduce(encodeArray(options)(key), []).join("&") : encode(key, options) + "=" + encode(val, options),
			""
		)
		.filter((x) => x.length > 0)
		.join("&");
};
