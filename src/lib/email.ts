import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@huddle.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendRoomInviteEmail({
  toEmail,
  toName,
  roomName,
  inviteId,
}: {
  toEmail: string;
  toName?: string | null;
  roomName: string;
  inviteId: string;
}) {
  const joinLink = `${APP_URL}/room/join?invite=${inviteId}`;

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `You've been invited to join "${roomName}" on Huddle`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 8px">Room Invite</h2>
          <p>Hi ${toName ?? "there"},</p>
          <p>You've been invited to join the room <strong>${roomName}</strong> on Huddle.</p>
          <a href="${joinLink}"
             style="display:inline-block;margin:16px 0;padding:10px 20px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
            Join Room
          </a>
          <p style="color:#666;font-size:13px">Or copy this link: ${joinLink}</p>
        </div>
      `,
    });
  } catch (error) {
    // Non-fatal: log but don't throw — in-app notification still delivered
    console.error("[email] Failed to send room invite email:", error);
  }
}
