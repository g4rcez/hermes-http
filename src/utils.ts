export const isEmpty = (object: any) => {
	if (typeof object === "undefined" || object === null) {
		return true;
	}
	if (Array.isArray(object) && object.length === 0) {
		return true;
	}
	if (typeof object === "string" && object.trim().length === 0) {
		return true;
	}
	for (const key in object) {
		if (object.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
};

export const resolveUrl = (base: string, uri: string) => (uri ? `${base.replace(/\/+$/, "")}/${uri.replace(/^\/+/, "")}` : base);
