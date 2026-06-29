import { db } from "@/db/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export class NotificationRepository {
  /**
   * Create a new tenant-aware notification for a user.
   */
  static async createNotification(
    tenantId: string,
    userId: string,
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "alert" = "info"
  ) {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        tenantId,
        userId,
        title,
        message,
        type,
      })
      .returning();

    return newNotification;
  }

  /**
   * Retrieve notifications for a specific user within a tenant.
   */
  static async getNotificationsForUser(tenantId: string, userId: string, limit = 20) {
    return db.query.notifications.findMany({
      where: and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId)
      ),
      orderBy: [desc(notifications.createdAt)],
      limit,
    });
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllAsRead(tenantId: string, userId: string) {
    return db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId)
        )
      );
  }
}
