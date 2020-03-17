import { ResponseSuccess, ResponseError } from "../hermes-http-types";

export type Interceptor<T> = (
	response: ResponseSuccess<T> | ResponseError<T>
) => Promise<ResponseSuccess<T> | ResponseError<T>>;

export const intercept = async <T>(
	response: ResponseSuccess<T> | ResponseError<T>,
	interceptors: Interceptor<T>[]
): Promise<ResponseSuccess<T> | ResponseError<T>> => {
	for (const interceptor of interceptors) {
		try {
			const responseMutate = await interceptor(response);
			response = { ...response, ...responseMutate };
		} catch (error) {
			response = { ...response, ...error };
		}
	}
	return response;
};