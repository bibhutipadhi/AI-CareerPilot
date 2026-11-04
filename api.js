const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : "http://localhost:5001")
).replace(/\/+$/, "");

export async function apiRequest(path, { method = "GET", body, signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : {
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not connect to the AI server at ${API_BASE_URL}.`);
    }
    throw error;
  }

  const responseText = await response.text();
  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    if (response.status === 404) {
      throw new Error(
        "The API route was not found. The backend on this port is outdated; restart it with `npm start --prefix server`."
      );
    }

    throw new Error(`The API server returned a non-JSON response (HTTP ${response.status}). Verify VITE_API_BASE_URL and restart the backend.`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("The API server returned an invalid JSON response.");
  }

  if (!response.ok) {
    const serverMessage = typeof data.error === "string"
      ? data.error
      : typeof data.error?.message === "string"
        ? data.error.message
        : null;
    throw new Error(
      serverMessage || "The request failed."
    );
  }

  return data;
}

export function postApi(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "POST", body });
}
