export type ChatMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export function buildUserChatMessage(
  prompt: string,
  imageDataUrl?: string,
): Array<{ role: 'user'; content: ChatMessageContent }> {
  if (!imageDataUrl) {
    return [{ role: 'user', content: prompt }];
  }

  return [
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: prompt },
      ],
    },
  ];
}
