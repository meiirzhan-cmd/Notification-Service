import { type NextRequest, NextResponse } from "next/server";
import {
  getNotificationHistory,
  markNotificationAsRead,
  deleteNotification,
  getUnreadCount,
} from "@/lib/services/notificationStore";

/**
 * GET /api/notifications/history
 *
 * Fetches notification history for a user.
 *
 * Query parameters:
 * - userId: string (required)
 * - limit: number (optional, default: 20, max: 100)
 * - offset: number (optional, default: 0)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get("userId");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const offsetParam = request.nextUrl.searchParams.get("offset");

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 }
    );
  }

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  if (isNaN(limit) || limit < 1) {
    return NextResponse.json(
      { error: "limit must be a positive number" },
      { status: 400 }
    );
  }

  if (isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: "offset must be a non-negative number" },
      { status: 400 }
    );
  }

  try {
    const { notifications, total } = await getNotificationHistory(userId, {
      limit,
      offset,
    });

    const unreadCount = await getUnreadCount(userId);

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + notifications.length < total,
      },
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notification history:", error);

    return NextResponse.json(
      { error: "Failed to fetch notification history" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/history
 *
 * Marks a notification as read.
 *
 * Request body:
 * {
 *   userId: string,
 *   notificationId: string
 * }
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, notificationId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!notificationId || typeof notificationId !== "string") {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const success = await markNotificationAsRead(userId, notificationId);

    if (!success) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);

    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/history
 *
 * Deletes a notification from history.
 *
 * Query parameters:
 * - userId: string (required)
 * - notificationId: string (required)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get("userId");
  const notificationId = request.nextUrl.searchParams.get("notificationId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 }
    );
  }

  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const success = await deleteNotification(userId, notificationId);

    if (!success) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);

    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
