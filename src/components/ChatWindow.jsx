import { useEffect, useRef, useState } from 'react';
import { formatClock, formatTimestamp } from '../utils/format.js';
import { Button } from './ui.jsx';

function dayKey(value) {
  return new Date(value).toDateString();
}

function ChatWindow({ messages, counterpartName, busy, error, onSend }) {
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const lastCount = useRef(0);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages.length]);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = draft.trim();

    if (!text || busy) {
      return;
    }

    const ok = await onSend(text);

    if (ok) {
      setDraft('');
    }
  }

  let previousDay = null;

  return (
    <div className="chat">
      <div className="chat__messages" role="log" aria-live="polite" aria-label="Messages">
        {messages.length === 0 ? (
          <p className="chat__empty">
            No messages yet. Say hello to {counterpartName || 'the other person'}.
          </p>
        ) : null}
        {messages.map((message) => {
          const day = dayKey(message.createdAt);
          const showDay = day !== previousDay;
          previousDay = day;

          return (
            <div key={message.id}>
              {showDay ? <p className="chat__day">{formatTimestamp(message.createdAt)}</p> : null}
              <div className={`bubble${message.isMine ? ' bubble--mine' : ''}`}>
                <p className="bubble__text">{message.message}</p>
                <span className="bubble__meta">
                  {formatClock(message.createdAt)}
                  {message.isMine ? (message.readAt ? ' · Read' : ' · Sent') : ''}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error ? (
        <p className="field-error chat__error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="chat__composer" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat__input"
          value={draft}
          maxLength={2000}
          placeholder="Type a message"
          aria-label="Message"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" size="sm" loading={busy} loadingText="…" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

export default ChatWindow;
