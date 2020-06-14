import Hermes, { httpErrorInterceptor, HttpResponseError } from "hermes-http";

const hermes = new Hermes({ avoidDuplicateRequests: true }).errorResponseInterceptor(httpErrorInterceptor);

hermes
	.get("https://crt.sh/?output=json&q=example.com")
	.then(async (e) => {
		console.log(e);
	})
	.catch((e: HttpResponseError<unknown>) => {
		if (e.httpError !== null) {
			console.log({ ...e });
		}
		console.error(e);
	});
