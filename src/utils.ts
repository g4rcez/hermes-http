export type QueryString<T extends string> = { [key in keyof T]: T[key] };

type Options = Partial<{ strict: boolean; encode: boolean }>;
export const isEmpty = (object: unknown) => {
	if (typeof object === "undefined" || object === null) {
		return true;
	}
	return Object.keys(object as any).length > 0;
};

export const concatUrl = (url: string, uri: string) =>
	uri ? `${url.replace(/\/+$/, "")}/${uri.replace(/^\/+/, "")}` : url;

const encStrict = (str: string) =>
	encodeURIComponent(str).replace(
		new RegExp("[!'()*]", "g"),
		(x) =>
			`%${x
				.charCodeAt(0)
				.toString(16)
				.toUpperCase()}`
	);

const enc = (value: string | number, options: Options) => {
	if (options.encode) {
		return options.strict ? encStrict(`${value}`) : encodeURIComponent(value);
	}
	return `${value}`;
};

export const encodeArray = (key: string, options: Options) => (result: string[], value: string) => {
	if (value === null || value === undefined || value.length === 0) {
		return result;
	}
	if (result.length === 0) {
		return [[enc(key, options), "=", enc(value, options)].join("")];
	}
	return [[result, enc(value, options)].join(",")];
};

export const qs = <T extends string>(args: QueryString<T>, opt: Options = { encode: true, strict: true }) => {
	if (!!!args) {
		return "";
	}

	const nonNull = Object.entries(args).reduce(
		(acc, [key, value]: [any, any]) =>
			(args[key] !== undefined || args[key] !== null ? { ...acc, [key]: value } : acc) as string,
		{}
	);

	return Object.entries(nonNull)
		.map(
			([key, val]: [any, any]) =>
				Array.isArray(val)
					? val.reduce(encodeArray(key, opt), []).join("&")
					: enc(key, opt) + "=" + enc(val, opt),
			""
		)
		.filter((x) => x.length > 0)
		.join("&");
};
