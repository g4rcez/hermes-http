import { QueryString } from "./utils";

export type AnyText = string | number;

export type BodyParser = "json" | "text" | "formData" | "arrayBuffer" | "blob";

export type RawHeaders = { [key: string]: AnyText };

export type DownloadTracking = { done: boolean; percent: number; total: number; transferred: number };

export type DownloadTracker = (parameters: DownloadTracking, bytes: Uint8Array) => void;

export type HermesSuccessResponse<SuccessBody> = {
	url: string;
	data: SuccessBody;
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

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export type Cache = "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached";

export type CredentialsMode = "same-origin" | "omit" | "include";

export type CorsMode = "same-origin" | "cors" | "navigate" | "no-cors";

export type RedirectMode = "follow" | "error" | "manual";

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

export type SuccessInterceptor<T> = (response: HermesSuccessResponse<T>) => Promise<HermesSuccessResponse<T>>;

export type ErrorInterceptor<T> = (response: ResponseError<T>) => Promise<ResponseError<T>>;

export type RequestConfig<T> = {
	onDownload?: DownloadTracker;
	query?: string;
	retryAfter: number;
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
	onDownload: DownloadTracker;
	arrayQueryFormat: "brackets" | "index" | "commas";
	headers: Headers;
	controller: AbortController;
	retries: number;
	retryAfter: number;
	retryCodes: number[];
	timeout: number;
	omitHeaders: string[];
}>;

export type HermesConfig = Partial<{
	baseUrl: string;
	globalTimeout: number;
	headers: RawHeaders;
	requestInterceptors: RequestInterceptor[];
	successResponseInterceptors: SuccessInterceptor<unknown>[];
	errorResponseInterceptors: SuccessInterceptor<unknown>[];
	responseType: string;
	retryStatusCode: number[];
	throwOnHttpError: boolean;
	timeout: number;
}>;

export type HermesClient = {
	addHeader: (key: string, value: string) => HermesClient;
	delete: <T>(url: string, body?: any, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	errorResponseInterceptor: <T>(interceptorFunction: ErrorInterceptor<T>) => HermesClient;
	get: <T>(url: string, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	getHeaders: () => Headers;
	getRetryCodes: () => number[];
	patch: <T>(url: string, body: any, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	post: <T>(url: string, body: any, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	put: <T>(url: string, body: any, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	requestInterceptor: (interceptorFunction: RequestInterceptor) => HermesClient;
	successResponseInterceptor: <T>(interceptorFunction: SuccessInterceptor<T>) => HermesClient;
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
