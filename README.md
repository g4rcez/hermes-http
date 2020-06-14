# hermes-http

Another wrap over fetch

## Features

- Make http requests for browser and node (using node-fetch)
- Avoid duplicate requests
- Intercept request, success response and error response
- Abort requests
- Retry requests
- Automatic conversion of request/response data
- Typescript out of the box

## Install

Using npm

```
npm i hermes-http
```

Using npm

```
yarn add hermes-http
```

Using pnpm

```
pnpm add hermes-http
``` 

## Using hermes

Hermes work with instances of http clients

```javascript
import Hermes from "http-client"

export const hermes = Hermes({
    /*
        if the same URL is called when the previous request
        is not finished, hermes will resolve the new promise
        with the previous promise and not performe a new 
        request
    */
    avoidDuplicateRequests: false,
    // Base Url for concat with all instance url requests
    baseUrl: "",
    /*
        Timeout value default for all requests.
        You can configure the timeout per request
    */
    globalTimeout: 0,
    /*
        Default headers for all requests
    */
    headers: {},
    /*
        When response throws an error, hermes catch the 
        status code to perform a new request based on this
        array with status code:

        default value: [408, 429, 451, 500, 502, 503, 504]
    */
	retryStatusCode: number[];
});
```

Now you can use hermes instance to perform http requests.

1. Get with query parameters

The second arg of `hermes.get` accept a query key for convert
an object in query string and concat with URL.

URL = "https://swapi.co/api/people"
query = { search: "r2" }
URL + query = "https://swapi.co/api/people?search=r2"

```typescript
// old school style
hermes.get("https://swapi.co/api/people", {
		query: {
			search: "r2"
		}
	})
	.then((response) => console.info(response))
	.catch((e: HttpResponseError<unknown>) => {
		if (e.httpError !== null) {
			console.log({ ...e });
		}
	});
// async/await
try {
    const response = hermes.get("https://swapi.co/api/people", {
		query: {
			search: "r2"
		}
    });
} catch (e){
    if (e.httpError !== null) {
        console.log({ ...e });
    }
}
```

For post request, you just drop the object as second parameter and
hermes will make all job for you.

```typescript
/*
    Hermes apply JSON.stringify on this object to perform request
*/
const response = await hermes.post("/user", { name: "Peter Parker", hero: "Spider Man" });
```

## Http Methods

```typescript
type RequestParameters = Partial<{
	query: QueryString<any>;
	encodeQueryString: boolean;
	headers: Headers;
	redirect?: RedirectMode;
	cors?: CorsMode;
	credentials?: CorsMode;
	controller: AbortController;
	retries: number;
	retryAfter: number;
	retryCodes: number[];
	timeout: number;
	omitHeaders: string[];
}>;

```

- hermes.get(url, RequestParams)
- hermes.delete(url, RequestParams)
- hermes.post(url, body, RequestParams)
- hermes.put(url, body, RequestParams)
- hermes.patch(url, body, RequestParams)

