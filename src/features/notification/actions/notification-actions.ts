"use server";

import { requireAuth, verifyWriteAccess } from "@/features/auth/services/session";
import { NotificationRepository } from "../repository/notification-repository";
import { revalidatePath } from "next/cache";

export async function getNotificationsAction() {
  try {
    const user = await requireAuth();
    const list = await NotificationRepository.getNotificationsForUser(user.tenantId, user.userId);
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch notifications." };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const user = await requireAuth();
    verifyWriteAccess(user);
    await NotificationRepository.markAsRead(user.tenantId, user.userId, notificationId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update notification." };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await requireAuth();
    verifyWriteAccess(user);
    await NotificationRepository.markAllAsRead(user.tenantId, user.userId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update notifications." };
  }
}
