/**
 * Slug helper utility for generating URL-friendly slugs
 */

export class SlugHelper {
  /**
   * Generates a URL-friendly slug from a string
   * @param text The input string to convert to slug
   * @returns A URL-friendly slug
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove all special characters except hyphens and spaces
      .replace(/\s+/g, '-') // Replace all spaces with single hyphen
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  }

  /**
   * Generates a unique slug by combining name and location
   * @param name The property name
   * @param location The property location (city, state, country)
   * @returns A unique slug based on name and location
   */
  static generatePropertySlug(
    name: string,
    location: {
      city?: string;
      state?: string;
      country?: string;
    },
  ): string {
    const locationParts = [
      location?.city,
      location?.state,
      location?.country,
    ].filter(Boolean);

    const combinedText =
      locationParts.length > 0 ? `${name} ${locationParts.join(' ')}` : name;

    return this.generateSlug(combinedText);
  }

  /**
   * Generates a random short ID for slug uniqueness
   * @returns A random short ID (4-5 characters)
   */
  static generateRandomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = Math.random() > 0.5 ? 4 : 5; // Random length between 4-5 characters

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Ensures slug uniqueness by appending a random short ID
   * @param baseSlug The base slug to use
   * @returns A unique slug with random ID
   */
  static ensureUniqueSlug(baseSlug: string): string {
    // Since we're using random IDs, the probability of collision is extremely low
    // We can directly append a random ID without checking existing slugs
    const randomId = this.generateRandomId();
    return `${baseSlug}-${randomId}`;
  }

  /**
   * Validates if a string is a valid slug format
   * @param slug The slug to validate
   * @returns True if valid slug format
   */
  static isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug) && slug.length > 0 && slug.length <= 255;
  }
}
