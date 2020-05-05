import { concatUrl, qs } from "../helpers/utils";
import {
	ErrorInterceptor,
	FetchParams,
	HttpMethods,
	InterceptedRequest,
	RequestInterceptor,
	ResponseError,
	ResponseSuccess,
	SuccessInterceptor,
	RequestConfig,
	Config,
	Interceptor
} from "../types";
import { hermes } from "./single-hermes";
import { statusCodeRetry } from "./codes";
import userAbortError from "./user-abort-error";

export class Hermes {
	private requestMap: Map<string, Promise<any> | null>;
	private requestInterceptors: RequestInterceptor[];
	private successResponseInterceptors: SuccessInterceptor<unknown>[];
	private errorResponseInterceptors: ErrorInterceptor<any>[];
	private internal: Config;

	public constructor(config?: Config) {
		this.errorResponseInterceptors = [];
		this.internal = {
			...config,
			cache: "no-cache",
			redirect: "follow",
			referrerPolicy: "no-referrer",
			retries: 1,
			retryInterval: 1000,
			timeout: 0,
			statusCodeRetry,
			avoidDuplicateRequests: true
		};
		this.requestInterceptors = [];
		this.requestMap = new Map<string, Promise<any> | null>();
		this.successResponseInterceptors = [];
	}

	private mockRequest<T>(url: string, promise: () => Promise<ResponseSuccess<T>>): Promise<ResponseSuccess<T>> {
		if (this.internal.avoidDuplicateRequests) {
			if (this.requestMap.has(url)) {
				return this.requestMap.get(url)!;
			} else {
				const request = promise();
				this.requestMap.set(url, request);
				return request;
			}
		}
		return promise();
	}

	private getDefaults = (key: keyof RequestConfig, config: RequestConfig) =>
		config[key] !== undefined ? config[key] : this.internal[key];

	private getInternalConfig = () => {
		const { avoidDuplicateRequests, baseUrl, ...config } = this.internal;
		return { config, baseUrl, avoidDuplicateRequests };
	};

	private configRequest(config: RequestConfig, defaults: Config, body: any, method: HttpMethods) {
		return {
			...defaults,
			...config,
			body,
			method,
			cache: this.getDefaults("cache", config),
			controller: this.getDefaults("controller", config) || new AbortController(),
			cors: this.getDefaults("cors", config),
			credentials: this.getDefaults("credentials", config),
			headers: this.getDefaults("headers", config),
			referrer: this.getDefaults("referrer", config),
			statusCodeRetry: this.getDefaults("statusCodeRetry", config),
			timeout: this.getDefaults("timeout", config)
		};
	}

	private async interceptRequest(req: FetchParams): Promise<InterceptedRequest> {
		if (this.errorResponseInterceptors.length === 0) {
			return { request: req, abort: false };
		}
		let request: FetchParams = { ...req };
		let abort = false;
		for (const interceptor of this.requestInterceptors) {
			try {
				const promiseValue = await interceptor({ ...req });
				request = { ...req, ...promiseValue.request };
				abort = promiseValue.abort ?? false;
			} catch (e) {
				request = { ...req, ...e.request };
				abort = e.abort ?? false;
			}
		}
		return { abort, request };
	}

	private async interceptResponse<T>(
		res: ResponseSuccess<T> | ResponseError<T>,
		interceptors: Interceptor<T>[]
	): Promise<ResponseSuccess<T> | ResponseError<T>> {
		if (interceptors.length === 0) {
			return res;
		}
		let response = { ...res };
		for (const interceptor of interceptors) {
			try {
				const responseMutate = await interceptor(response);
				response = { ...response, ...responseMutate };
			} catch (error) {
				response = { ...response, ...error };
			}
		}
		return response;
	}

	private async request<T>(url: string, method: HttpMethods, body: any, config: RequestConfig) {
		const { baseUrl, config: defaults } = this.getInternalConfig();

		const base = baseUrl || "";
		let requestUrl = base === "" ? url : concatUrl(base, url);
		const queryStr = qs(config.query || {}, { encode: true }).trim();
		if (queryStr !== "") {
			requestUrl = requestUrl += `?${queryStr}`;
		}

		const req = await this.interceptRequest(this.configRequest(config, defaults, body, method));

		if (req.abort) {
			return Promise.reject(userAbortError);
		}

		try {
			let promiseResponse: Promise<ResponseSuccess<T>> = this.mockRequest(requestUrl, () =>
				hermes<T>(url, req.request)
			);
			const response = await promiseResponse;
			return Promise.resolve(await this.interceptResponse(response, this.successResponseInterceptors));
		} catch (error) {
			return Promise.reject(await this.interceptResponse(error, this.errorResponseInterceptors)) as any;
		}
	}

	public requestInterceptor(interceptor: RequestInterceptor) {
		this.requestInterceptors.push(interceptor);
		return this;
	}
	public successResponseInterceptor<T>(interceptor: SuccessInterceptor<T>) {
		this.successResponseInterceptors.push(interceptor);
		return this;
	}

	public errorResponseInterceptor<T>(interceptor: ErrorInterceptor<T>) {
		this.errorResponseInterceptors.push(interceptor);
		return this;
	}

	public async get<T>(url: string, config: RequestConfig): Promise<ResponseSuccess<T>> {
		return this.request<T>(url, "GET", undefined, config);
	}
	public async delete<T>(url: string, config: RequestConfig): Promise<ResponseSuccess<T>> {
		return this.request<T>(url, "DELETE", undefined, config);
	}
	public async post<T>(url: string, body: any, config: RequestConfig): Promise<ResponseSuccess<T>> {
		return this.request<T>(url, "POST", body, config);
	}
	public async patch<T>(url: string, body: any, config: RequestConfig): Promise<ResponseSuccess<T>> {
		return this.request<T>(url, "PATCH", body, config);
	}
	public async put<T>(url: string, body: any, config: RequestConfig): Promise<ResponseSuccess<T>> {
		return this.request<T>(url, "PUT", body, config);
	}
}
