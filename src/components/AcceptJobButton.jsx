import { useState } from 'react';
import { useAction } from '../hooks/useApi.js';
import { navigate } from '../hooks/useRoute.js';
import { providerApi } from '../services/fixApi.js';
import { Button, ConfirmDialog, Notice } from './ui.jsx';

// Claims an open request for the signed-in provider. The backend decides atomically who
// wins; on success the provider lands on the new job, on 409 the caller is told the job
// is gone (`onTaken`) so it can stop offering it.
function AcceptJobButton({ requestId, size, block = true, onTaken, onFailed }) {
  const action = useAction();
  const [confirming, setConfirming] = useState(false);

  async function accept() {
    let bookingId = null;
    const ok = await action.run('accept', async () => {
      try {
        bookingId = (await providerApi.accept(requestId)).booking.id;
      } catch (error) {
        if (error.code === 'REQUEST_ALREADY_ACCEPTED') onTaken?.();
        throw error;
      }
    });
    setConfirming(false);

    if (ok && bookingId) {
      navigate(`/provider/jobs/${bookingId}?accepted=1`);
    } else if (!ok) {
      onFailed?.();
    }
  }

  return (
    <>
      <Notice>{action.error}</Notice>
      <Button block={block} size={size} onClick={() => setConfirming(true)} disabled={Boolean(action.pending)}>
        Accept Job
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Accept this job?"
        message="You’ll be assigned to this customer and the request will close for other providers."
        confirmLabel="Accept Job"
        busy={action.pending === 'accept'}
        onConfirm={accept}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export default AcceptJobButton;
