import { ResponseSuccess } from "../hermes-http-types";

const cacheName = "hermes-http-cache";

export const fetchCache = async (e: ResponseSuccess<any>) => {
	try {
		const cache = await window.caches.open(cacheName);
		cache.add(e.url);
	} catch (error) {
	} finally {
		return Promise.resolve(e);
	}
};
