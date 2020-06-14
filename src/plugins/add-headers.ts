import HttpHeaders from "../http/http-headers";
import { FetchParams, RawHeaders } from "../types";

export const addHeaders = (callback: (requestHeaders: RawHeaders) => RawHeaders) => async (e: FetchParams) => {
	const mock = e.headers || new HttpHeaders();
	return callback(HttpHeaders.rawHeaders(mock.get()));
};
