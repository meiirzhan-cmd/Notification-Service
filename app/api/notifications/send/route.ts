import { type NextRequest, NextResponse } from "next/server";
import { publishNotification, type CreateNotificationInput } from "@/lib/notifications";

/**
 * POST /api/notifications/send
 *
 * Publishes a notification to RabbitMQ for processing.
 *
 * Request body:
 * {
 *   userId: string,
 *   type: "email" | "push" | "in-app",
 *   title: string,
 *   body: string,
 *   category: "marketing" | "updates" | "security" | "social" | "reminders",
 *   metadata?: Record<string, unknown>
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate required fields
    const { userId, type, title, body: notificationBody, category, metadata } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!type || !["email", "push", "in-app"].includes(type)) {
      return NextResponse.json(
        { error: "type must be one of: email, push, in-app" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required and must be a string" },
        { status: 400 }
      );
    }

    if (!notificationBody || typeof notificationBody !== "string") {
      return NextResponse.json(
        { error: "body is required and must be a string" },
        { status: 400 }
      );
    }

    const validCategories = ["marketing", "updates", "security", "social", "reminders"];
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const input: CreateNotificationInput = {
      userId,
      type,
      title,
      body: notificationBody,
      category,
      metadata,
    };

    const notification = await publishNotification(input);

    return NextResponse.json(
      {
        success: true,
        notification,
        message: "Notification published successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error publishing notification:", error);

    return NextResponse.json(
      {
        error: "Failed to publish notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
