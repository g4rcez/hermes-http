import { QueryString } from "./utils";

export type Txt = string | number | boolean;

export type BodyParser = "json" | "text" | "formData" | "arrayBuffer" | "blob";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export type Cache = "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached";

export type CredentialsMode = "same-origin" | "omit" | "include";

export type CorsMode = "same-origin" | "cors" | "no-cors";

export type RedirectMode = "follow" | "error" | "manual";

export type RawHeaders = { [key: string]: Txt };

export type ResponseSuccess<Body> = {
	url: string;
	data: Body;
	error: null;
	headers: { [key: string]: string };
	ok: boolean;
	status: number;
	statusText: string | null;
};

type UnTypeResponse<T> = {
	url: string;
	data?: T;
	error: string | number;
	headers: { [key: string]: string };
	ok: false;
	status: number;
	statusText: string | null;
};

export type ResponseError<T> = null extends T
	? UnTypeResponse<T>
	: {
			url: string;
			readonly data: T;
			error: string | number;
			headers: { [key: string]: string };
			ok: false;
			status: number;
			statusText: string | null;
	  };

export type RequestInterceptorParameter<T> = {
	body: T;
	cache: Cache;
	credentials: CredentialsMode;
	headers: Headers;
	keepalive: boolean;
	method: HttpMethods;
	mode: CorsMode;
	redirect: RedirectMode;
	referrer: string;
	url: string;
};

export type RequestInterceptorResult = Promise<{
	abort?: boolean;
	request: {
		body: any;
		cache: Cache;
		credentials: CredentialsMode;
		headers: Headers;
		keepalive: boolean;
		method: HttpMethods;
		mode: CorsMode;
		redirect: RedirectMode;
		referrer: string;
		signal?: AbortSignal;
		url: string;
	};
}>;

export type RequestInterceptor = <T>(request: RequestInterceptorParameter<T>) => RequestInterceptorResult;

export type SuccessInterceptor<T> = (response: ResponseSuccess<T>) => Promise<ResponseSuccess<T>>;

export type ErrorInterceptor<T> = (response: ResponseError<T>) => Promise<ResponseError<T>>;

export type RequestConfig<T> = {
	query?: string;
	retryAfter: number;
	redirect?: RedirectMode;
	cors?: CorsMode;
	credentials?: CorsMode;
	url: string;
	body: T | null;
	method: HttpMethods;
	retries: number;
	headers: Headers;
	retryOnCodes: number[];
	signal?: AbortSignal;
};

export type RequestParameters = Partial<{
	query: QueryString<any>;
	encodeQueryString: boolean;
	headers: Headers;
	redirect?: RedirectMode;
	cors?: CorsMode;
	credentials?: CorsMode;
	controller: AbortController;
	retries: number;
	retryAfter: number;
	retryCodes: number[];
	timeout: number;
	omitHeaders: string[];
}>;

export type HermesConfig = Partial<{
	avoidDuplicateRequests: boolean;
	baseUrl: string;
	globalTimeout: number;
	headers: RawHeaders;
	retryStatusCode: number[];
}>;

export type Hermes = {
	addHeader: (key: string, value: string) => Hermes;
	delete: <T>(url: string, body?: any, params?: RequestParameters) => Promise<ResponseSuccess<T>>;
	errorResponseInterceptor: <T>(interceptorFunction: ErrorInterceptor<T>) => Hermes;
	get: <T>(url: string, params?: RequestParameters) => Promise<ResponseSuccess<T>>;
	getHeaders: () => Headers;
	getRetryCodes: () => number[];
	patch: <T>(url: string, body: any, params?: RequestParameters) => Promise<ResponseSuccess<T>>;
	post: <T>(url: string, body: any, params?: RequestParameters) => Promise<ResponseSuccess<T>>;
	put: <T>(url: string, body: any, params?: RequestParameters) => Promise<ResponseSuccess<T>>;
	requestInterceptor: (interceptorFunction: RequestInterceptor) => Hermes;
	successResponseInterceptor: <T>(interceptorFunction: SuccessInterceptor<T>) => Hermes;
};

declare global {
	namespace NodeJS {
		interface Global {
			fetch: typeof fetch;
			Headers: any;
			Response: any;
			AbortController: any;
		}
	}
}
