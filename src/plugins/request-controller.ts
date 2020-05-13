import { hermes } from "../http/http-client";
import type { FetchParams, HermesResponse } from "../types";

export const hermesControl = async <T>(url: string, params: FetchParams) => {
	const controller = new AbortController();
	const loading = { status: true };
	const promise = hermes(url, { ...params, controller }).finally(() => (loading.status = false));
	const control = {
		loading,
		response: promise as Promise<HermesResponse<T>>,
		abort: controller.abort,
		isAborted: controller.signal.aborted,
		onAbort: controller.signal.onabort
	};
	return control;
};

hermesControl.get = async <T>(url: string, params: FetchParams) => hermesControl(url, params);
hermesControl.delete = async <T>(url: string, params: FetchParams) =>
	hermesControl(url, { ...params, method: "DELETE" });

hermesControl.post = async <T>(url: string, body: any, params: FetchParams) =>
	hermesControl(url, { ...params, body, method: "POST" });

hermesControl.put = async <T>(url: string, body: any, params: FetchParams) =>
	hermesControl(url, { ...params, body, method: "PUT" });

hermesControl.patch = async <T>(url: string, body: any, params: FetchParams) =>
	hermesControl(url, { ...params, body, method: "PATCH" });
