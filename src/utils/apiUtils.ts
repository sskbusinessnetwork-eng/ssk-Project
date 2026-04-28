/**
 * Safely fetches from an API and ensures the response is JSON.
 * If the response is not JSON, it returns a descriptive error.
 */
export async function safeFetch(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
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
    console.error(`API Fetch Error (${url}):`, error);
    throw error;
  }
}
