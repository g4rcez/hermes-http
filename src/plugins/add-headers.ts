import { FetchParams, RawHeaders } from "../types";
import HttpHeaders from "../http/http-headers";

export const addHeaders = (callback: (requestHeaders: RawHeaders) => RawHeaders) => async (e: FetchParams) => {
	const mock = e.headers || new HttpHeaders();
	return callback(HttpHeaders.rawHeaders(mock.get()));
};
