import Hermes, { httpErrorInterceptor, HttpResponseError } from "hermes-http";

const hermes = Hermes({ avoidDuplicateRequests: true }).errorResponseInterceptor(httpErrorInterceptor);

hermes
	.get<{ results: string[] }>("https://swapi.co/api/people", {
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
