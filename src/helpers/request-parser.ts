import { BodyParser } from "../types";

export const mimeTypes = [
	["json", "application/json"],
	["formData", "multipart/form-data"],
	["text", "text/"],
	["blob", "*/*"]
];

export const getParser = (value: string | undefined | null = ""): BodyParser => {
	if (value === undefined || value === null) {
		return "blob";
	}
	const lowerCase = value.toLowerCase();
	for (const [type] of mimeTypes) {
		if (lowerCase.indexOf(type) >= 0) {
			return type as BodyParser;
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
