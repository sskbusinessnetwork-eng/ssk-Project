/**
 * Safely fetches from an API and ensures the response is JSON.
 * If the response is not JSON, it returns a descriptive error.
 */
export async function safeFetch(url: string, options: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 12_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const externalSignal = fetchOptions.signal;
  const onExternalAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  let timedOut = false;
  const timer =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    const contentType = response.headers.get("content-type");
    
    let text = "";
    try {
      text = await response.text();
    } catch (e) {
      text = "Could not read response text";
    }

    let data: any = null;
    if (contentType && contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Failed to parse server response as JSON. Body: " + text.slice(0, 100));
      }
    } else {
      // If it's HTML, it might be a 404 or 500 from the server/proxy
      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
        const preview = text.slice(0, 300).replace(/<[^>]*>?/gm, ' ').trim();
        throw new Error(`Server returned an error page (HTML) instead of JSON. \nStatus: ${response.status}\nPreview: ${preview}\nCheck if the API route is correctly defined or if there is a proxy redirect issue.`);
      }
      throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
    }

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data;
  } catch (error: any) {
    if (timedOut) {
      const timeoutErr = new Error(`Request to ${url} timed out. Please try again.`);
      timeoutErr.name = 'TimeoutError';
      console.error(`API Fetch Timeout (${url}):`, timeoutErr);
      throw timeoutErr;
    }
    console.error(`API Fetch Error (${url}):`, error);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
