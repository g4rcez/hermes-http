import { HttpErrorCodes } from "./codes";

export default {
	data: null,
	error: "timeout",
	headers: {},
	ok: false,
	status: HttpErrorCodes.REQUEST_TIMEOUT,
	statusText: ""
};
