export async function fetchSSEUrl(payload: object, apiUrl: string): Promise<string> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Failed to fetch SSE URL: ${res.statusText}`);

  const data = await res.json();
  if (!data.sseUrl) throw new Error("Response missing sseUrl property");

  return data.sseUrl;
}

export const startSSE = (
  url: string,
  onMessage: (data: any) => void
) => {
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (err) {
      console.error("Failed to parse SSE JSON:", err, event.data);
    }
  };

  eventSource.onerror = (err) => {
    console.error("SSE connection error:", err);
    eventSource.close();
  };

  return () => {
    eventSource.close();
    console.log("SSE connection closed");
  };
};