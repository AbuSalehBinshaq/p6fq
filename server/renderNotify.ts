export async function notifyRenderOwner(input: { title: string; content: string }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Notification] DISCORD_WEBHOOK_URL is not configured.");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `**${input.title}**\n${input.content}` }),
    });

    if (!response.ok) throw new Error(`Discord returned ${response.status}`);
    return true;
  } catch (error) {
    console.error("[Notification] Failed to notify owner:", error);
    return false;
  }
}
