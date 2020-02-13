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

export type HermesResponse<SuccessBody, ErrorBody> =
	| {
			url: string;
			data: ErrorBody;
			error: string | number;
			headers: { [key: string]: string };
			ok: boolean;
			status: number;
			statusText: string | null;
	  }
	| {
			url: string;
			data: SuccessBody;
			error: null;
			headers: { [key: string]: string };
			ok: boolean;
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

export type SuccessInterceptor<T> = (response: HermesResponse<T, never>) => Promise<HermesResponse<T, any>>;

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
	query: { [key: string]: unknown };
	encodeQueryString: boolean;
	onDownload: DownloadTracker;
	arrayQueryFormat: "brackets" | "index" | "commas" | undefined;
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
	addRetryCodes: (code: number) => HttpClientReturn;
	delete: <T, E>(url: string, body?: unknown, params?: RequestParameters) => Promise<HermesResponse<T, E>>;
	get: <T, E>(url: string, params?: RequestParameters) => Promise<HermesResponse<T, E>>;
	getHeaders: () => Headers;
	getRetryCodes: () => number[];
	patch: <T, E>(url: string, body: unknown, params?: RequestParameters) => Promise<HermesResponse<T, E>>;
	post: <T, E>(url: string, body: unknown, params?: RequestParameters) => Promise<HermesResponse<T, E>>;
	put: <T, E>(url: string, body: unknown, params?: RequestParameters) => Promise<HermesResponse<T, E>>;
	requestInterceptor: (interceptorFunction: RequestInterceptors) => HttpClientReturn;
	successResponseInterceptor: <T>(interceptorFunction: SuccessInterceptor<T>) => HttpClientReturn;
};

declare global {
	namespace NodeJS {
		interface Global {
			fetch: any;
			Headers: any;
			Response: any;
			AbortController: any;
		}
	}
}
