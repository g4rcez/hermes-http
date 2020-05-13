import { HttpResponseError, hermesControl } from "hermes-http";

// const hermes = new Hermes({ avoidDuplicateRequests: true }).errorResponseInterceptor(httpErrorInterceptor);

hermesControl
	.get<{ results: string[] }>("https://swapi.dev/api/people/1", {
		query: {
			search: "r2"
		}
	})
	.then(async (e) => {
		console.info(e);
		const data = await e.response;
		console.log(e, data);
	})
	.catch((e: HttpResponseError<unknown>) => {
		if (e.httpError !== null) {
			console.log({ ...e });
		}
	});
