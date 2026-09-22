import { useEffect, useRef, useState } from 'react';
import { uploadsApi } from '../services/fixApi.js';
import { Button } from './ui.jsx';

const MAX_DURATION_SECONDS = 120;
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }

  return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function isRecordingSupported() {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// A single optional voice note attached to a new request. Recording is entirely
// local (nothing is sent, and the mic is never touched, until the customer presses
// Record); the resulting clip uploads immediately once recording stops, the same
// eager-upload pattern ImageAttachments uses for photos.
function VoiceRecorder({ value, onChange, disabled }) {
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastBlobRef = useRef(null);

  useEffect(
    () => () => {
      window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopTimer() {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function upload(blob, durationSeconds) {
    setStatus('uploading');
    setError('');

    try {
      const extension = (blob.type.split('/')[1] || 'webm').split(';')[0];
      const file = new File([blob], `voice-note.${extension}`, { type: blob.type });
      const result = await uploadsApi.audio(file);

      onChange({
        url: result.audio.url,
        format: result.audio.format || null,
        durationSeconds: result.audio.durationSeconds ?? durationSeconds,
      });
      setStatus('idle');
    } catch (uploadError) {
      setStatus('error');
      setError(uploadError.message);
    }
  }

  async function startRecording() {
    if (!isRecordingSupported()) {
      setStatus('unsupported');
      return;
    }

    setError('');
    setStatus('requesting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('denied');
      setError('Microphone access was denied. Allow microphone access in your browser to record a voice message.');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      stopStream();
      stopTimer();
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
      lastBlobRef.current = { blob, durationSeconds: elapsedRef.current };
      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      upload(blob, elapsedRef.current);
    };

    recorder.start();
    startedAtRef.current = Date.now();
    elapsedRef.current = 0;
    setElapsed(0);
    setStatus('recording');

    timerRef.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      elapsedRef.current = seconds;
      setElapsed(seconds);

      if (seconds >= MAX_DURATION_SECONDS) {
        recorder.stop();
      }
    }, 250);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function retryUpload() {
    if (lastBlobRef.current) {
      upload(lastBlobRef.current.blob, lastBlobRef.current.durationSeconds);
    }
  }

  function removeRecording() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setElapsed(0);
    elapsedRef.current = 0;
    lastBlobRef.current = null;
    setStatus('idle');
    setError('');
    onChange(null);
  }

  if (status === 'unsupported') {
    return (
      <div className="field">
        <label>Voice message (optional)</label>
        <p className="field-hint">Voice recording isn’t supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="field">
      <label>Voice message (optional)</label>

      {value ? (
        <div className="voice-recorder voice-recorder--done">
          <audio controls preload="none" src={previewUrl || value.url} className="voice-recorder__player" />
          <span className="voice-recorder__duration">
            {value.durationSeconds ? formatDuration(value.durationSeconds) : ''}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={removeRecording}
            disabled={disabled}
          >
            Delete &amp; re-record
          </Button>
        </div>
      ) : status === 'recording' ? (
        <div className="voice-recorder voice-recorder--recording">
          <span className="voice-recorder__dot" aria-hidden="true" />
          <span aria-live="polite">Recording… {formatDuration(elapsed)}</span>
          <Button type="button" variant="secondary" size="sm" onClick={stopRecording}>
            Stop
          </Button>
        </div>
      ) : status === 'requesting' ? (
        <div className="voice-recorder">
          <span className="spinner spinner--sm" aria-hidden="true" />
          <span>Requesting microphone access…</span>
        </div>
      ) : status === 'uploading' ? (
        <div className="voice-recorder">
          {previewUrl ? <audio controls preload="none" src={previewUrl} className="voice-recorder__player" /> : null}
          <span className="spinner spinner--sm" aria-hidden="true" />
          <span>Uploading…</span>
        </div>
      ) : (
        <div className="voice-recorder">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={status === 'error' ? retryUpload : startRecording}
            disabled={disabled}
          >
            {status === 'error' ? 'Retry upload' : 'Record voice message'}
          </Button>
          {status === 'error' ? (
            <button type="button" className="text-link" onClick={removeRecording}>
              Discard
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="field-error">{error}</p>
      ) : (
        <p className="field-hint">
          Up to 2 minutes. Describe the problem out loud so the provider can hear it directly.
        </p>
      )}
    </div>
  );
}

export default VoiceRecorder;
