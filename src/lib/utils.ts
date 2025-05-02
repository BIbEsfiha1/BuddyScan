import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a simple unique identifier.
 * Combines timestamp with a random suffix.
 * NOTE: For production, consider using a more robust library like `uuid`.
 * @param prefix Optional prefix for the ID.
 * @returns A unique string identifier.
 */
export function generateUniqueId(prefix: string = 'plant'): string {
    const timestamp = Date.now().toString(36); // Base 36 for shorter timestamp
    const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 random chars
    return `${prefix}-${timestamp}-${randomSuffix}`;
}
