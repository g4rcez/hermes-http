export const isEmpty = (object: any) => {
	if (typeof object === "undefined" || object === null) {
		return true;
	}
	if (Array.isArray(object) && object.length === 0) {
		return true;
	}
	if (typeof object === "string" && object.trim().length === 0) {
		return true;
	}
	for (const key in object) {
		if (object.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
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

type ArrayFormatEncode = "index" | "brackets" | "commas";
type Options = Partial<{
	array: ArrayFormatEncode;
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
	return (key: string) => (result: string[], value: string) => {
		if (value === undefined || value === null) {
			return result;
		}
		return [...result, [encode(key, options), "=", encode(value, options)].join("")];
	};
};

type QueryStringObject = { [key: string]: unknown };

const defaultOptions = {
	array: "commas" as ArrayFormatEncode,
	encode: true,
	strict: true
};

export const queryString = (object: QueryStringObject, options: Options = defaultOptions) => {
	if (!!!object) {
		return "";
	}

	const formatter = encodeArray(options);

	const objectNonNull = Object.entries(object).reduce((acc, [key, value]) => {
		if (object[key] !== undefined || object[key] !== null) {
			return { ...acc, [key]: value };
		}
		return acc;
	}, {});

	return Object.entries(objectNonNull)
		.map(([key, value]) => {
			if (Array.isArray(value)) {
				return value.reduce(formatter(key), []).join("&");
			}
			return encode(key, options) + "=" + encode(value as string, options);
		})
		.filter((x) => x.length > 0)
		.join("&");
};
