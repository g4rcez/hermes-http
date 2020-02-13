import { QueryString } from "./utils";
import { ErrorResponse } from ".";

export type AnyText = string | number;

export type FetchBodyParser = "json" | "text" | "formData" | "arrayBuffer" | "blob";

export type HeaderProps = { [key: string]: AnyText };

export type RawHeaders = { [key: string]: AnyText };

export type DownloadTracking = {
	done: boolean;
	percent: number;
	total: number;
	transferred: number;
};

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
	// data?: T;
	error: string | number;
	headers: { [key: string]: string };
	ok: false;
	status: number;
	statusText: string | null;
};

export type HermesErrorResponse<T> = null extends T
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

export type Credentials = "same-origin" | "omit" | "include";

export type ModeRequest = "same-origin" | "cors" | "navigate" | "no-cors";

export type Redirect = "follow" | "error" | "manual";

export type RequestInterceptorParameter = {
	body: any;
	cache: Cache;
	credentials: Credentials;
	headers: Headers;
	keepalive: boolean;
	method: HttpMethods;
	mode: ModeRequest;
	redirect: Redirect;
	referrer: string;
	url: string;
};

export type RequestInterceptorReturn = Promise<{
	abort?: boolean;
	request: {
		body: any;
		cache: Cache;
		credentials: Credentials;
		headers: Headers;
		keepalive: boolean;
		method: HttpMethods;
		mode: ModeRequest;
		redirect: Redirect;
		referrer: string;
		signal?: AbortSignal;
		url: string;
	};
}>;

export type RequestInterceptors = (request: RequestInterceptorParameter) => RequestInterceptorReturn;

export type SuccessInterceptor<T> = (response: HermesSuccessResponse<T>) => Promise<HermesSuccessResponse<T>>;

export type ErrorInterceptor<T> = (response: HermesErrorResponse<T>) => Promise<HermesErrorResponse<T>>;

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
	headers: HeaderProps;
	requestInterceptors: RequestInterceptors[];
	successResponseInterceptors: SuccessInterceptor<unknown>[];
	errorResponseInterceptors: SuccessInterceptor<unknown>[];
	responseType: string;
	retryStatusCode: number[];
	throwOnHttpError: boolean;
	timeout: number;
}>;

export type HttpClientReturn = {
	addHeader: (key: string, value: string) => HttpClientReturn;
	delete: <T>(url: string, body?: unknown, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	get: <T>(url: string, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	getHeaders: () => Headers;
	getRetryCodes: () => number[];
	patch: <T>(url: string, body: unknown, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	post: <T>(url: string, body: unknown, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	put: <T>(url: string, body: unknown, params?: RequestParameters) => Promise<HermesSuccessResponse<T>>;
	requestInterceptor: (interceptorFunction: RequestInterceptors) => HttpClientReturn;
	successResponseInterceptor: <T>(interceptorFunction: SuccessInterceptor<T>) => HttpClientReturn;
	errorResponseInterceptor: <T>(interceptorFunction: ErrorInterceptor<T>) => HttpClientReturn;
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
