import { useEffect, useState, useRef } from 'react';

const getResponseError = async (response: Response): Promise<string> => {
  const responseText = await response.text();

  try {
    const body: unknown = JSON.parse(responseText);

    if (typeof body === 'object' && body !== null) {
      const message = (body as Record<string, unknown>).detail
        ?? (body as Record<string, unknown>).message
        ?? (body as Record<string, unknown>).error;

      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  } catch {
    // Use the raw response text when the backend does not return JSON.
  }

  return responseText.trim() || `Request failed (${response.status})`;
};

function App() {
  const [urlInput, setUrlInput] = useState('');
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSSE = async () => {
    if (!urlInput) return alert('Please enter a URL');

    if (requestController.current) {
      requestController.current.abort();
    }

    setEventData(null);
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    requestController.current = controller;

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/result?url=${encodeURIComponent(urlInput)}`,
        {
          headers: {
            'X-Request-ID': crypto.randomUUID(),
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        setError(await getResponseError(response));
        return;
      }

      if (!response.body) {
        throw new Error('SSE response did not include a stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split(/\r?\n\r?\n/);
        buffer = messages.pop() ?? '';

        for (const message of messages) {
          const data = message
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n');

          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              setError(parsed.error);
              return;
            }

            setEventData(parsed);
          } catch {
            console.error('Invalid JSON:', data);
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('SSE connection error:', err);
        setError('Unable to connect to the backend.');
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      requestController.current?.abort();
    };
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '1rem',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        backgroundColor: '#f0f2f5',
        overflow: 'hidden',
      }}
    >
      <h1 style={{ textAlign: 'center' }}>Web Analyzer</h1>
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={urlInput}
          placeholder="Enter URL"
          onChange={(e) => setUrlInput(e.target.value)}
          style={{
            padding: '0.5rem',
            width: '400px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
          disabled={loading}
        />
        
        <button
          onClick={startSSE}
          style={{
            marginLeft: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: loading ? '#6c757d' : '#007bff',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '90px',
          }}
          disabled={loading}
        >
          {loading ? (
            <>
              <span
                style={{
                  border: '2px solid #f3f3f3',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  marginRight: '8px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Fetching...
            </>
          ) : (
            'Start'
          )}
        </button>
      </div>

      <div
        style={{
          width: '1200px',
          maxHeight: '600px',
          overflowY: 'auto',
          background: '#fff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #ddd',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        {eventData ? (
          <div>
      
            <h2>Page Analysis</h2>
            <p><strong>Version:</strong> {String(eventData.Version)}</p>
            <p><strong>Title:</strong> {String(eventData.Title)}</p>

            <h3>Headers</h3>
            <ul>
              {typeof eventData.Headers === 'object' && eventData.Headers !== null
                ? Object.entries(eventData.Headers as Record<string, any>).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key.toUpperCase()}:</strong> {value ?? 'null'}
                  </li>
                ))
                : <li>No headers found</li>}
            </ul>

            <h3>Internal Links</h3>
            <p><strong>Count:</strong> {eventData.InternalLinks?.Count ?? 'null'}</p>
            <ul>
              {Array.isArray(eventData.InternalLinks?.Links)
                ? eventData.InternalLinks.Links.map((link: string, i: number) => (
                  <li key={`internal-${i}`}>{link}</li>
                ))
                : <li>Links: Not found</li>}
            </ul>

            <h3>External Links</h3>
            <p><strong>Count:</strong> {eventData.ExternalLinks?.Count ?? 'null'}</p>
            <ul>
              {Array.isArray(eventData.ExternalLinks?.Links)
                ? eventData.ExternalLinks.Links.map((link: string, i: number) => (
                  <li key={`external-${i}`}>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  </li>
                ))
                : <li>Links: Not found</li>}
            </ul>

            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'green' }}>
                Active Links ({eventData.ActiveLinks?.Count || 0}):
              </strong>
              <p><strong>Count:</strong> {eventData.ActiveLinks?.Count || 0}</p>
              <ul>
                {eventData.ActiveLinks?.Links?.map((link: string, i: number) => (
                  <li key={`active-${i}`} style={{ color: 'green' }}>
                    <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                  </li>
                )) || <li style={{ color: 'gray' }}>None</li>}
              </ul>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong style={{ color: 'red' }}>
                Inactive Links ({eventData.InactiveLinks?.Count || 0}):
              </strong>
              <p><strong>Count:</strong> {eventData.InactiveLinks?.Count || 0}</p>
              <ul>
                {eventData.InactiveLinks?.Links?.map((link: string, i: number) => (
                  <li key={`inactive-${i}`} style={{ color: 'red' }}>
                    <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                  </li>
                )) || <li style={{ color: 'gray' }}>None</li>}
              </ul>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: error ? 'red' : undefined }}>
            {error ?? (loading ? 'Please wait...' : 'Welcome')}
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  );
}

export default App;