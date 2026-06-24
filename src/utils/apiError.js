// Normalise Axios error responses into a readable string.
// Covers: { message }, { error }, { detail }, { errors: [...] }, network errors.
export function extractApiError(error) {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.error)   return data.error;
  if (data?.detail)  return data.detail;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors[0]?.message ?? data.errors[0];
  }

  if (error?.message === "Network Error") {
    return "No internet connection. Please check your network.";
  }

  if (error?.response?.status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  return error?.message ?? "Something went wrong. Please try again.";
}
