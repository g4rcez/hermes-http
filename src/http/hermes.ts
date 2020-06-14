import { concatUrl, qs } from "../helpers/utils";
import type {
	Config,
	ErrorInterceptor,
	FetchParams,
	HermesResponse,
	HttpMethods,
	InterceptedRequest,
	Interceptor,
	RequestConfig,
	RequestInterceptor,
	SuccessInterceptor
} from "../types";
import { statusCodeRetry } from "./codes";
import { hermes } from "./http-client";
import userAbortError from "./user-abort-error";

export class Hermes {
	public configuration: Config;
	private requestMap: Map<string, Promise<any> | null>;
	private requestInterceptors: RequestInterceptor[];
	private successResponseInterceptors: Array<SuccessInterceptor<any>>;
	private errorResponseInterceptors: Array<ErrorInterceptor<any>>;

	public constructor(config?: Config) {
		this.errorResponseInterceptors = [];
		this.configuration = {
			...config,
			avoidDuplicateRequests: true,
			cache: "no-cache",
			redirect: "follow",
			referrerPolicy: "no-referrer",
			retries: 1,
			retryInterval: 1000,
			statusCodeRetry,
			timeout: 0
		};
		this.requestInterceptors = [];
		this.requestMap = new Map<string, Promise<any>>();
		this.successResponseInterceptors = [];
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

	public async get<T>(url: string, cfg?: RequestConfig): Promise<HermesResponse<T>> {
		return this.request<T>(url, "GET", undefined, cfg);
	}

	public async delete<T>(url: string, cfg?: RequestConfig): Promise<HermesResponse<T>> {
		return this.request<T>(url, "DELETE", undefined, cfg);
	}

	public async post<T>(url: string, body: any, cfg?: RequestConfig): Promise<HermesResponse<T>> {
		return this.request<T>(url, "POST", body, cfg);
	}

	public async patch<T>(url: string, body: any, cfg?: RequestConfig): Promise<HermesResponse<T>> {
		return this.request<T>(url, "PATCH", body, cfg);
	}

	public async put<T>(url: string, body: any, cfg?: RequestConfig): Promise<HermesResponse<T>> {
		return this.request<T>(url, "PUT", body, cfg);
	}

	private mockRequest<T>(url: string, promise: () => Promise<HermesResponse<T>>): Promise<HermesResponse<T>> {
		if (this.configuration.avoidDuplicateRequests) {
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

	private defaults = (key: keyof RequestConfig, config: RequestConfig) =>
		config[key] !== undefined ? config[key] : (this.configuration as RequestConfig)[key];

	private getInternalConfig = () => {
		const { avoidDuplicateRequests, baseUrl, ...config } = this.configuration;
		return { config, baseUrl, avoidDuplicateRequests };
	};

	private configRequest(cfg: RequestConfig, defaults: Config, body: any, method: HttpMethods) {
		return {
			...defaults,
			...cfg,
			body,
			avoidDuplicateRequests: this.defaults("avoidDuplicateRequests", cfg),
			cache: this.defaults("cache", cfg),
			controller: this.defaults("controller", cfg) || new AbortController(),
			cors: this.defaults("cors", cfg),
			credentials: this.defaults("credentials", cfg),
			headers: this.defaults("headers", cfg),
			method,
			referrer: this.defaults("referrer", cfg),
			statusCodeRetry: this.defaults("statusCodeRetry", cfg),
			timeout: this.defaults("timeout", cfg)
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
				abort = promiseValue.abort || false;
			} catch (e) {
				request = { ...req, ...e.request };
				abort = e.abort || false;
			}
		}
		return { abort, request };
	}

	private async interceptResponse<Res, I extends Interceptor<any>>(res: Res, interceptors: I[]): Promise<Res> {
		if (interceptors.length === 0) {
			return res;
		}
		let response = { ...res };
		for (const interceptor of interceptors) {
			try {
				const responseMutate = await interceptor(response as any);
				response = { ...response, ...responseMutate };
			} catch (error) {
				response = { ...response, ...error };
			}
		}
		return response;
	}

	private async request<T>(url: string, method: HttpMethods, body: any, config: RequestConfig = {}) {
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
		const response = await hermes<T>(url, req.request);
		if (response.error) {
			return Promise.resolve(await this.interceptResponse(response, this.errorResponseInterceptors)) as any;
		}
		return Promise.resolve(await this.interceptResponse(response, this.successResponseInterceptors as any));
	}
}
