import { RequestInterceptorParameter } from "../hermes-http-types";

type RawHeaders = { [key: string]: string };
export const addHeaders = (callback: (requestHeaders: RawHeaders) => RawHeaders) => async (
	e: RequestInterceptorParameter<never>
) => {
	const headers = {};
	e.headers.forEach(([value, key]) => {
		headers[key] = value;
	});
	return callback(headers);
};
