import Hermes from "hermes-http";
import React, { useEffect, useState } from "react";

const hermes = Hermes({ avoidDuplicateRequests: true });

export default function App() {
	const [state, setState] = useState({});
	useEffect(() => {
		hermes
			.get("https://api.postmon.com.br/v1/cep/38706400")
			.then((e) => {
				console.log(e);
				setState(e);
			})
			.catch(setState);
		hermes
			.get("https://api.postmon.com.br/v1/cep/38706400")
			.then((e) => {
				console.log(e);
				setState(e);
			})
			.catch(setState);
		hermes
			.get("https://api.postmon.com.br/v1/cep/38706400")
			.then((e) => {
				console.log(e);
				setState(e);
			})
			.catch(setState);
	}, []);
	return (
		<pre>
			<code>{JSON.stringify(state, null, 4)}</code>
		</pre>
	);
}
