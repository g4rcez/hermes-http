import { BodyParser } from "../types";

export const mimeTypes = ["json", "formData", "text", "blob"];

export const getParser = (value: string | undefined | null = ""): BodyParser => {
	if (value === undefined || value === null) {
		return "blob";
	}
	const lowerCase = value.toLowerCase();
	for (const t of mimeTypes) {
		if (lowerCase.indexOf(t) >= 0) {
			return t as BodyParser;
		}
	}
	return "blob";
};

export const parseBody = (body: unknown | any) => {
	if (body === undefined || body === null) {
		return null;
	}
	if (Array.isArray(body) || body.toString().toLowerCase() === "[object object]") {
		return JSON.stringify(body);
	}
	return body;
};
