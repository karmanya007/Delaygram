import NotificationsClient from "./NotificationsClient";
import { getNotificationsQuery } from "@/server/queries/notifications.query";

async function NotificationsPage() {
    const { notifications } = await getNotificationsQuery();

    return <NotificationsClient initialNotifications={notifications} />
}

export default NotificationsPage;
