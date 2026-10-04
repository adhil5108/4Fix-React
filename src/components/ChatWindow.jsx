import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCheck, MessageCircle, SendHorizontal } from 'lucide-react';
import { formatClock, formatTimestamp } from '../utils/format.js';

function dayKey(value) {
  return new Date(value).toDateString();
}

// Messages + composer. The page decides the frame: full screen (ChatPage) or embedded.
function ChatWindow({ messages, counterpartName, busy, error, onSend }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const lastCount = useRef(0);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages.length]);

  // The composer grows with the message (up to a few lines), like a messaging app.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }, [draft]);

  async function send() {
    const text = draft.trim();

    if (!text || busy) {
      return;
    }

    const ok = await onSend(text);

    if (ok) {
      setDraft('');
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    send();
  }

  let previousDay = null;

  return (
    <div className="chat">
      <div className="chat__messages" role="log" aria-live="polite" aria-label={t('cards.chat.messagesLabel')}>
        {messages.length === 0 ? (
          <div className="chat__empty">
            <span className="state__icon" aria-hidden="true">
              <MessageCircle />
            </span>
            <p>{t('cards.chat.empty', { name: counterpartName || t('cards.chat.otherPerson') })}</p>
          </div>
        ) : null}
        {messages.map((message) => {
          const day = dayKey(message.createdAt);
          const showDay = day !== previousDay;
          previousDay = day;

          return (
            <Fragment key={message.id}>
              {showDay ? <p className="chat__day">{formatTimestamp(message.createdAt)}</p> : null}
              <div className={`bubble${message.isMine ? ' bubble--mine' : ''}`}>
                <p className="bubble__text">{message.message}</p>
                <span className="bubble__meta">
                  {formatClock(message.createdAt)}
                  {message.isMine ? (
                    message.readAt ? (
                      <CheckCheck className="is-read" aria-label={t('cards.chat.read')} />
                    ) : (
                      <Check aria-label={t('cards.chat.sent')} />
                    )
                  ) : null}
                </span>
              </div>
            </Fragment>
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
        <textarea
          ref={inputRef}
          rows={1}
          className="chat__input"
          value={draft}
          maxLength={2000}
          placeholder={t('cards.chat.placeholder')}
          aria-label={t('cards.chat.inputLabel')}
          enterKeyHint="send"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends on a hardware keyboard; Shift+Enter adds a new line.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button
          type="submit"
          className="chat__send"
          disabled={!draft.trim() || busy}
          aria-label={t('cards.chat.send')}
          title={t('cards.chat.send')}
        >
          {busy ? <span className="spinner spinner--sm" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
