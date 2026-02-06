import { type NextRequest, NextResponse } from "next/server";
import {
  getUserPreferences,
  setUserPreferences,
  deleteUserPreferences,
} from "@/lib/services/userPreferences";

/**
 * GET /api/preferences
 *
 * Retrieves user preferences from Redis cache.
 *
 * Query parameters:
 * - userId: string (required)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const preferences = await getUserPreferences(userId);

    return NextResponse.json({
      preferences,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);

    return NextResponse.json(
      { error: "Failed to fetch user preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/preferences
 *
 * Updates user preferences in Redis cache.
 *
 * Request body:
 * {
 *   userId: string,
 *   channels?: {
 *     email?: boolean,
 *     push?: boolean,
 *     sms?: boolean,
 *     inApp?: boolean
 *   },
 *   categories?: {
 *     marketing?: boolean,
 *     updates?: boolean,
 *     security?: boolean,
 *     social?: boolean,
 *     reminders?: boolean
 *   },
 *   quietHours?: {
 *     enabled: boolean,
 *     start: string,    // HH:mm format
 *     end: string,      // HH:mm format
 *     timezone: string
 *   },
 *   frequency?: "realtime" | "hourly" | "daily" | "weekly"
 * }
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, channels, categories, quietHours, frequency } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate channels if provided
    if (channels !== undefined) {
      if (typeof channels !== "object" || channels === null) {
        return NextResponse.json(
          { error: "channels must be an object" },
          { status: 400 }
        );
      }

      const validChannelKeys = ["email", "push", "sms", "inApp"];
      for (const key of Object.keys(channels)) {
        if (!validChannelKeys.includes(key)) {
          return NextResponse.json(
            { error: `Invalid channel: ${key}. Valid channels: ${validChannelKeys.join(", ")}` },
            { status: 400 }
          );
        }
        if (typeof channels[key] !== "boolean") {
          return NextResponse.json(
            { error: `Channel ${key} must be a boolean` },
            { status: 400 }
          );
        }
      }
    }

    // Validate categories if provided
    if (categories !== undefined) {
      if (typeof categories !== "object" || categories === null) {
        return NextResponse.json(
          { error: "categories must be an object" },
          { status: 400 }
        );
      }

      const validCategoryKeys = ["marketing", "updates", "security", "social", "reminders"];
      for (const key of Object.keys(categories)) {
        if (!validCategoryKeys.includes(key)) {
          return NextResponse.json(
            { error: `Invalid category: ${key}. Valid categories: ${validCategoryKeys.join(", ")}` },
            { status: 400 }
          );
        }
        if (typeof categories[key] !== "boolean") {
          return NextResponse.json(
            { error: `Category ${key} must be a boolean` },
            { status: 400 }
          );
        }
      }
    }

    // Validate quietHours if provided
    if (quietHours !== undefined) {
      if (typeof quietHours !== "object" || quietHours === null) {
        return NextResponse.json(
          { error: "quietHours must be an object" },
          { status: 400 }
        );
      }

      if (typeof quietHours.enabled !== "boolean") {
        return NextResponse.json(
          { error: "quietHours.enabled must be a boolean" },
          { status: 400 }
        );
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (quietHours.start && !timeRegex.test(quietHours.start)) {
        return NextResponse.json(
          { error: "quietHours.start must be in HH:mm format" },
          { status: 400 }
        );
      }

      if (quietHours.end && !timeRegex.test(quietHours.end)) {
        return NextResponse.json(
          { error: "quietHours.end must be in HH:mm format" },
          { status: 400 }
        );
      }
    }

    // Validate frequency if provided
    if (frequency !== undefined) {
      const validFrequencies = ["realtime", "hourly", "daily", "weekly"];
      if (!validFrequencies.includes(frequency)) {
        return NextResponse.json(
          { error: `frequency must be one of: ${validFrequencies.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updatedPreferences = await setUserPreferences(userId, {
      channels,
      categories,
      quietHours,
      frequency,
    });

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);

    return NextResponse.json(
      { error: "Failed to update user preferences" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/preferences
 *
 * Deletes user preferences from Redis cache (resets to defaults).
 *
 * Query parameters:
 * - userId: string (required)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const success = await deleteUserPreferences(userId);

    return NextResponse.json({
      success,
      message: success
        ? "Preferences deleted (reset to defaults)"
        : "No preferences found to delete",
    });
  } catch (error) {
    console.error("Error deleting user preferences:", error);

    return NextResponse.json(
      { error: "Failed to delete user preferences" },
      { status: 500 }
    );
  }
}
