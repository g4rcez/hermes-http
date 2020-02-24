import { HermesSuccessResponse, RequestInterceptorParameter, ResponseError } from "../../dist/hermes-http-types";
import { HermesClient } from "../hermes-http-types";

type DedupeMap = Map<
	string,
	{
		timestamps: number;
		body: any;
	}
>;

const avoidRequests: DedupeMap = new Map();

export const dedupeRequest = async <T>(e: RequestInterceptorParameter<T>) => {
	if (!avoidRequests.has(e.url)) {
		avoidRequests.set(e.url, { body: e.body, timestamps: new Date().getTime() });
		return {
			request: e,
			abort: false
		};
	}
	return {
		request: e,
		abort: true
	};
};

type concat<T extends any> = HermesSuccessResponse<T> & ResponseError<T>;

export const clearDedupe = async <T>(e: concat<T>, clearAfter?: number) => {
	if (avoidRequests.has(e.url)) {
		if (typeof clearAfter === "number") {
			const request = avoidRequests.get(e.url)!;
			const now = new Date().getTime();
			if (now - request.timestamps >= clearAfter) {
				avoidRequests.delete(e.url);
			}
		}
	}
	return e;
};

export const applyDedupe = (hermes: HermesClient) => {
	hermes
		.requestInterceptor(dedupeRequest)
		.errorResponseInterceptor(clearDedupe)
		.successResponseInterceptor(clearDedupe);
};
