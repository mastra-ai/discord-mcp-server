import retry from "async-retry-ng";

const TIMEOUT = 20000; // 20 seconds
const MAX_RETRIES = 10;

const fetchWithTimeout = async (
  url: string,
  options: RequestInit
): Promise<Response> => {
  try {
    const response = (await Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), TIMEOUT)
      ),
    ])) as Response;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response body:`, errorText);
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorText}`
      );
    }

    return response;
  } catch (error) {
    console.error("FetchWithTimeout error:", error);
    throw error;
  }
};

export const retryableFetch = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  return retry(
    async (bail: (error: Error) => void) => {
      try {
        const response = await fetchWithTimeout(url, options);
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          console.error("JSON parse error:", e);
          throw new Error(`Failed to parse JSON response: ${text}`);
        }
        return data as T;
      } catch (error: any) {
        console.error("Fetch error details:", {
          message: error.message,
          stack: error.stack,
          url,
          method: options.method,
        });

        if (
          error.message.includes("timeout") ||
          error.message.includes("429") ||
          error.message.includes("50")
        ) {
          console.error(`Retryable Error:
            URL: ${url}
            Method: ${options.method}
            Error: ${error.message}
            Reason: ${
              error.message.includes("timeout")
                ? "Timeout"
                : error.message.includes("429")
                ? "Rate Limited"
                : "Server Error"
            }
          `);
          throw error;
        }
        console.error(`Fatal Request Error:
          URL: ${url}
          Method: ${options.method}
          Error: ${error.message}
          ${error.stack ? `\nStack: ${error.stack}` : ""}
        `);
        bail(error); // Don't retry other errors
        return null as T; // This will never be reached due to bail()
      }
    },
    {
      retries: MAX_RETRIES,
      minTimeout: 1000,
      maxTimeout: 5000,
      factor: 2,
      onRetry: (error: Error, ...args: any[]) => {
        const [attempt] = args;
        console.log(
          `Retry attempt ${attempt}/${MAX_RETRIES} due to:`,
          error.message
        );
      },
    }
  );
};
