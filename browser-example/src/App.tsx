import Hermes from "hermes-http";
import React, { useState } from "react";

const hermes = new Hermes({
	avoidDuplicateRequests: true
});

function App() {
	const [file, setFile] = useState<File>();

	const onSubmit = (e: any) => {
		e.preventDefault();
		hermes.get("https://api.postmon.com.br/v1/cep/38706400").then(console.log);
		hermes.get("https://api.postmon.com.br/v1/cep/38706400").then(console.log);
		hermes.get("https://api.postmon.com.br/v1/cep/38706400").then(console.log);
	};

	return (
		<form onSubmit={onSubmit}>
			<input
				type="file"
				onChange={(e) => {
					setFile(e.target.files![0]);
				}}
			/>
			<button type="submit">Submit</button>
		</form>
	);
}

export default function AppAppApp() {
	return (
		<div>
			<App></App>
		</div>
	);
}
