/**
 * Error handling utilities for async operations
 * Provides consistent error handling patterns across the app
 */

export interface AsyncError {
  message: string;
  code?: string;
  originalError?: Error;
  context?: string;
}

/**
 * Safely execute async function with error handling
 * @param asyncFn - Async function to execute
 * @param context - Description of what operation is happening
 * @returns Result or error object
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  context: string = "Operation"
): Promise<{ data?: T; error?: AsyncError }> {
  try {
    const data = await asyncFn();
    return { data };
  } catch (err) {
    const error: AsyncError = {
      message: err instanceof Error ? err.message : String(err),
      code: err instanceof Error ? (err as any).code : undefined,
      originalError: err instanceof Error ? err : undefined,
      context,
    };
    console.error(`[${context}] Error:`, error);
    return { error };
  }
}

/**
 * Retry async operation with exponential backoff
 * @param asyncFn - Async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delay - Initial delay in ms (default: 1000)
 * @param context - Description of operation
 */
export async function retryAsync<T>(
  asyncFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  context: string = "Operation"
): Promise<{ data?: T; error?: AsyncError }> {
  let lastError: AsyncError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await safeAsync(asyncFn, `${context} (attempt ${attempt + 1}/${maxRetries + 1})`);

    if (result.data) {
      return { data: result.data };
    }

    lastError = result.error!;

    // Don't retry on last attempt
    if (attempt < maxRetries) {
      const waitTime = delay * Math.pow(2, attempt); // Exponential backoff
      console.warn(`[${context}] Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  return { error: lastError! };
}

/**
 * Extract user-friendly error message
 */
export function getUserFriendlyError(error: AsyncError | Error | unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const err = error as AsyncError;
    if (err.code === "PGRST116") return "Resource not found";
    if (err.code === "23503") return "Referenced resource no longer exists";
    if (err.message.includes("network")) return "Network error. Please check your connection.";
    if (err.message.includes("timeout")) return "Operation timed out. Please try again.";
    return err.message || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message || "An unexpected error occurred";
  }

  return "An unexpected error occurred";
}

/**
 * Execute async function with timeout
 * @param asyncFn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param context - Description of operation
 */
export async function asyncWithTimeout<T>(
  asyncFn: () => Promise<T>,
  timeoutMs: number = 30000,
  context: string = "Operation"
): Promise<{ data?: T; error?: AsyncError }> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${context} timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const data = await Promise.race([asyncFn(), timeoutPromise]);
    return { data };
  } catch (err) {
    return {
      error: {
        message: err instanceof Error ? err.message : String(err),
        context,
        originalError: err instanceof Error ? err : undefined,
      },
    };
  }
}
