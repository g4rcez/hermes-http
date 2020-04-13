import Hermes, { fetchCache } from "hermes-http";
import React, { useState } from "react";

const hermes = Hermes({
	avoidDuplicateRequests: true,
	globalTimeout: 10000
}).successResponseInterceptor(fetchCache);

function App() {
	const [file, setFile] = useState<File>();

	const onSubmit = (e: any) => {
		e.preventDefault();
		const form = new FormData();
		console.log({ file });
		form.append("file", file as any);
		const headers = new Headers();
		headers.set("Content-Type", "multipart/form-data;boundary=----WebKitFormBoundaryprgHUtVK2ez7ORTh;");
		hermes.post("http://localhost:3030/upload", form);
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
