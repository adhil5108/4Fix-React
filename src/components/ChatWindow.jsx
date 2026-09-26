import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatClock, formatTimestamp } from '../utils/format.js';
import { Button } from './ui.jsx';

function dayKey(value) {
  return new Date(value).toDateString();
}

function ChatWindow({ messages, counterpartName, busy, error, onSend }) {
  const { t } = useTranslation();
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
      <div className="chat__messages" role="log" aria-live="polite" aria-label={t('cards.chat.messagesLabel')}>
        {messages.length === 0 ? (
          <p className="chat__empty">
            {t('cards.chat.empty', { name: counterpartName || t('cards.chat.otherPerson') })}
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
                  {message.isMine ? ` · ${message.readAt ? t('cards.chat.read') : t('cards.chat.sent')}` : ''}
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
          placeholder={t('cards.chat.placeholder')}
          aria-label={t('cards.chat.inputLabel')}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" size="sm" loading={busy} loadingText="…" disabled={!draft.trim()}>
          {t('cards.chat.send')}
        </Button>
      </form>
    </div>
  );
}

export default ChatWindow;
