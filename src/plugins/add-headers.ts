import { RequestInterceptorParameter } from "../hermes-http-types";

export const addHeaders = (callback: (requestHeaders: Headers) => Headers) => async (
	e: RequestInterceptorParameter<never>
) => callback(e.headers);
