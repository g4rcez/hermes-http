import Hermes, { fetchCache } from "hermes-http";
import React, { useEffect, useState } from "react";

const hermes = Hermes({
	avoidDuplicateRequests: true,
	globalTimeout: 10000,
	baseUrl: "https://api.postmon.com.br/v1/cep/"
}).successResponseInterceptor(fetchCache);

function App({ cep }: { cep: string }) {
	const [state, setState] = useState({});
	useEffect(() => {
		hermes
			.get(cep)
			.then(setState)
			.catch(setState);
	}, [cep]);
	return (
		<pre>
			<code>{JSON.stringify(state, null, 4)}</code>
		</pre>
	);
}

export default function AppAppApp() {
	return (
		<div>
			<App cep="38706400"></App>
			<App cep="70040020"></App>
			<App cep="70040020"></App>
			<App cep="38706400"></App>
		</div>
	);
}
