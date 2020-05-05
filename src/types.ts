import { QueryString } from "./helpers/utils";
import HttpHeaders from "./http/http-headers";

export type Txt = string | number | boolean;

export type BodyParser = "json" | "text" | "formData" | "arrayBuffer" | "blob";

export type HttpMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export type RawHeaders = { [key: string]: Txt };

export type ResponseSuccess<Body extends any> = {
	error: string | null;
	headers: { [key: string]: string };
	readonly data: Body;
	readonly ok: boolean;
	readonly redirected: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly type: ResponseType;
	readonly url: string;
};

export type ResponseError<T> = {
	url: string;
	data: T;
	error: string | number;
	headers: { [key: string]: string };
	ok: false;
	status: number;
	statusText: string | null;
};

export type InterceptedRequest = { abort: boolean; request: FetchParams };

export type RequestInterceptor = (request: FetchParams) => Promise<InterceptedRequest>;

export type SuccessInterceptor<T> = (response: ResponseSuccess<T>) => Promise<ResponseSuccess<T>>;

export type ErrorInterceptor<T> = (response: ResponseError<T>) => Promise<ResponseError<T>>;

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
	response: ResponseSuccess<T> | ResponseError<T>
) => Promise<ResponseSuccess<T> | ResponseError<T>>;

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
			Headers: any;
			Response: any;
			AbortController: any;
		}
	}
}
