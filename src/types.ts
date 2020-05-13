import { QueryString } from "./helpers/utils";
import HttpHeaders from "./http/http-headers";

export type Txt = string | number | boolean;

export type BodyParser = "json" | "text" | "formData" | "arrayBuffer" | "blob";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export type RawHeaders = { [key: string]: Txt };

export type HermesResponse<Body extends any> =
	| {
			error: null;
			headers: { [key: string]: string };
			readonly data: Body;
			readonly ok: true;
			readonly redirected: boolean;
			readonly status: number;
			readonly statusText: string;
			readonly type: ResponseType;
			readonly url: string;
	  }
	| {
			error: string | number | null;
			headers: { [key: string]: string };
			readonly data: Body;
			readonly ok: false;
			readonly redirected: boolean;
			readonly status: number;
			readonly statusText: string;
			readonly type: ResponseType;
			readonly url: string;
	  };

export type InterceptedRequest = { abort: boolean; request: FetchParams };

export type RequestInterceptor = (request: FetchParams) => Promise<InterceptedRequest>;

export type SuccessInterceptor<T> = (response: HermesResponse<T>) => Promise<HermesResponse<T>>;

export type ErrorInterceptor<T> = (response: HermesResponse<T>) => Promise<HermesResponse<T>>;

export type FetchParams = {
	body?: any;
	method?: HttpMethods;
	cache?: RequestCache;
	statusCodeRetry?: number[];
	controller?: AbortController;
	cors?: "same-origin" | "cors" | "no-cors";
	credentials?: "include" | "omit" | "same-origin";
	headers?: HttpHeaders;
	query?: QueryString<any>;
	redirect?: "follow" | "error" | "manual";
	referrer?: string;
	referrerPolicy?: ReferrerPolicy;
	retries?: number;
	retryInterval?: number;
	timeout?: number;
};

export type Interceptor<T> = (
	response: HermesResponse<T> | HermesResponse<T>
) => Promise<HermesResponse<T> | HermesResponse<T>>;

export type Config = Partial<{
	baseUrl: string;
	avoidDuplicateRequests: boolean;
}> &
	Omit<FetchParams, "query">;

export type RequestConfig = Partial<{
	method: HttpMethods;
	query: QueryString<{ [key: string]: string }>;
	headers: HttpHeaders;
}> &
	Omit<FetchParams, "url">;

declare global {
	namespace NodeJS {
		interface Global {
			fetch: typeof fetch;
			Headers: Headers;
			Request: Omit<Request, "method"> & {
				method: HttpMethods;
			};
			Response: Response;
			AbortController: AbortController;
		}
	}
}

export type HermesClient = (<T>(url: string, params: FetchParams) => Promise<HermesResponse<T>>) & {
	get: <T>(url: string, params: FetchParams) => Promise<HermesResponse<T>>;
	post: <T>(url: string, body: any, params: FetchParams) => Promise<HermesResponse<T>>;
	put: <T>(url: string, body: any, params: FetchParams) => Promise<HermesResponse<T>>;
	patch: <T>(url: string, body: any, params: FetchParams) => Promise<HermesResponse<T>>;
	delete: <T>(url: string, params: FetchParams) => Promise<HermesResponse<T>>;
};
