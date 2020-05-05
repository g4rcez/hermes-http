import Hermes, { httpErrorInterceptor, HttpResponseError } from "hermes-http";

const hermes = new Hermes({ avoidDuplicateRequests: true }).errorResponseInterceptor(httpErrorInterceptor);

hermes
	.get<{ results: string[] }>("https://swapi.dev/api/people/1", {
		query: {
			search: "r2"
		}
	})
	.then((e) => console.info(e))
	.catch((e: HttpResponseError<unknown>) => {
		if (e.httpError !== null) {
			console.log({ ...e });
		}
	});
