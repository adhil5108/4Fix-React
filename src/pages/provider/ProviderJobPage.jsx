import { useState } from 'react';
import AppShell from '../../components/AppShell.jsx';
import { ScheduleForm } from '../../components/JobActions.jsx';
import JobNotes from '../../components/JobNotes.jsx';
import PaymentCard from '../../components/PaymentCard.jsx';
import TextField, { Select } from '../../components/TextField.jsx';
import TrackingTimeline from '../../components/TrackingTimeline.jsx';
import { AddressBlock, AttachmentList, VoiceNoteBlock } from '../../components/cards.jsx';
import {
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  DetailList,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
} from '../../components/ui.jsx';
import { useAction, useApi } from '../../hooks/useApi.js';
import { bookingsApi, providerApi } from '../../services/fixApi.js';
import { formatDateTime, formatMoney, formatSlot } from '../../utils/format.js';

const TERMINAL = ['COMPLETED', 'CANCELLED'];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

// The next action is derived from both the request lifecycle and the booking status;
// nothing here changes state locally — every button calls the backend and refreshes.
function nextAction(booking) {
  const { requestStatus, status } = booking;

  if (status === 'CANCELLED' || requestStatus === 'CANCELLED') return null;
  if (requestStatus === 'QUOTE_ACCEPTED') return 'schedule';
  if (requestStatus === 'COMPLETED' || status === 'COMPLETED') return null;
  if (requestStatus === 'IN_PROGRESS') return 'complete';
  if (status === 'CONFIRMED') return 'assign';
  if (status === 'ASSIGNED') return 'on-the-way';
  if (status === 'ON_THE_WAY') return 'arrived';
  if (status === 'ARRIVED') return 'start';
  return null;
}

const ACTION_COPY = {
  assign: {
    title: 'Booking confirmed',
    text: 'Let the customer know you’re handling this job.',
    button: 'Accept assignment',
  },
  'on-the-way': {
    title: 'Ready to go?',
    text: 'Tell the customer you’re on your way. Sharing your location helps them track you.',
    button: 'I’m on my way',
  },
  arrived: {
    title: 'On the way',
    text: 'Mark arrived when you reach the customer. Ask them for the arrival code.',
    button: 'I’ve arrived',
  },
  start: {
    title: 'Arrived',
    text: 'Start the service once the customer has shared their arrival code.',
    button: 'Start service',
  },
  complete: {
    title: 'Service in progress',
    text: 'Mark the service complete once the work is done. Payment opens for the customer.',
    button: 'Mark as complete',
  },
};

function LocationShare({ bookingId, onUpdated, disabled }) {
  const share = useAction();
  const [note, setNote] = useState('');

  function shareLocation() {
    if (!navigator.geolocation) {
      share.setError('Location is not available in this browser.');
      return;
    }

    share.run('location', () =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await bookingsApi.updateLocation(bookingId, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
              setNote(`Location shared at ${formatDateTime(new Date().toISOString())}.`);
              onUpdated();
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          () => reject(new Error('Could not read your location. Check location permissions.')),
          { enableHighAccuracy: true, timeout: 10000 },
        );
      }),
    );
  }

  return (
    <div className="form-stack">
      <Notice>{share.error}</Notice>
      {note ? <Notice tone="success">{note}</Notice> : null}
      <Button variant="secondary" onClick={shareLocation} loading={share.pending === 'location'} loadingText="Sharing…" disabled={disabled}>
        Share my current location
      </Button>
      <p className="field-hint">Only your latest position is stored, and only for this booking.</p>
    </div>
  );
}

function RecordPayment({ bookingId, onRecorded }) {
  const record = useAction();
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await record.run('paid', () =>
      bookingsApi.markPaid(bookingId, { method, transactionReference: reference.trim() }),
    );
    if (ok) onRecorded();
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <Notice>{record.error}</Notice>
      <Select
        id="method"
        label="How did the customer pay?"
        value={method}
        options={PAYMENT_METHODS}
        onChange={(event) => setMethod(event.target.value)}
      />
      <TextField
        id="reference"
        label="Reference (optional)"
        maxLength={120}
        value={reference}
        placeholder="UPI / card reference"
        onChange={(event) => setReference(event.target.value)}
      />
      <Button type="submit" block loading={record.pending === 'paid'} loadingText="Recording…">
        Record payment received
      </Button>
    </form>
  );
}

function ProviderJobPage({ bookingId }) {
  const data = useApi(async () => {
    const { booking } = await bookingsApi.get(bookingId);
    let payment = null;

    if (booking.status === 'COMPLETED') {
      try {
        payment = (await bookingsApi.payment(bookingId)).payment;
      } catch (error) {
        if (error.status !== 404) throw error;
      }
    }

    return { booking, payment };
  }, [bookingId]);
  const action = useAction();
  const [confirm, setConfirm] = useState(null);
  const [success, setSuccess] = useState('');

  const back = { to: '/provider/jobs', label: 'My jobs' };

  if (data.loading) {
    return (
      <AppShell>
        <LoadingState label="Loading job…" />
      </AppShell>
    );
  }

  if (data.error && !data.data) {
    return (
      <AppShell>
        <PageHeader title="Job" back={back} />
        <ErrorState
          error={data.error.status === 400 ? { status: 404, message: 'This job could not be found.' } : data.error}
          onRetry={data.reload}
        />
      </AppShell>
    );
  }

  const { booking, payment } = data.data;
  const request = booking.request;
  const step = nextAction(booking);
  const isLive = !TERMINAL.includes(booking.status);

  async function perform(key, operation, message) {
    setSuccess('');
    const ok = await action.run(key, operation);
    setConfirm(null);
    if (ok) setSuccess(message);
    await data.refresh();
    return ok;
  }

  const runners = {
    assign: () => perform('assign', () => bookingsApi.assign(booking.id), 'You’re assigned to this job.'),
    'on-the-way': () => perform('on-the-way', () => bookingsApi.onTheWay(booking.id), 'The customer can see you’re on the way.'),
    arrived: () => perform('arrived', () => bookingsApi.arrived(booking.id), 'Marked as arrived.'),
    start: () => perform('start', () => providerApi.start(booking.requestId), 'Service started.'),
    complete: () => perform('complete', () => providerApi.complete(booking.requestId), 'Service marked as complete.'),
  };

  const confirmContent = {
    start: {
      title: 'Start the service?',
      message: 'The customer will see that work is in progress. This can’t be undone.',
      confirmLabel: 'Start service',
    },
    complete: {
      title: 'Mark service as complete?',
      message: 'Only do this once the work is finished. The customer will be asked to pay and review.',
      confirmLabel: 'Mark complete',
    },
  }[confirm];

  return (
    <AppShell>
      <PageHeader
        back={back}
        title={booking.service?.name || 'Job'}
        subtitle={[request?.issueLabel, booking.customer?.name ? `for ${booking.customer.name}` : null].filter(Boolean).join(' · ')}
        actions={<StatusBadge status={booking.status} audience="booking" />}
      />

      <div className="stack">
        <Notice tone="success">{success}</Notice>
        <Notice>{action.error}</Notice>
        {data.error ? <Notice>{data.error.message}</Notice> : null}
      </div>

      <div className="detail-layout">
        <div className="detail-layout__main">
          {step === 'schedule' ? (
            <Card className="card--accent">
              <h2 className="card__title">Schedule the visit</h2>
              <p className="body-text">
                The customer asked for {formatSlot(request.preferredDate, request.preferredTime)}.
              </p>
              <ScheduleForm
                request={request}
                busy={action.pending === 'schedule'}
                onSubmit={(payload) =>
                  perform('schedule', () => providerApi.schedule(booking.requestId, payload), 'Visit scheduled.')
                }
              />
            </Card>
          ) : null}

          {step && step !== 'schedule' ? (
            <Card className="card--accent">
              <h2 className="card__title">{ACTION_COPY[step].title}</h2>
              <p className="body-text">{ACTION_COPY[step].text}</p>
              <Button
                block
                onClick={() => (confirmContent === undefined && ['start', 'complete'].includes(step) ? setConfirm(step) : runners[step]())}
                loading={action.pending === step}
                loadingText="Updating…"
                disabled={Boolean(action.pending) && action.pending !== step}
              >
                {ACTION_COPY[step].button}
              </Button>
            </Card>
          ) : null}

          {booking.status === 'COMPLETED' ? (
            <>
              <Card>
                <h2 className="card__title">Service completed</h2>
                <p className="body-text">
                  Completed {formatDateTime(booking.timeline.completedAt)}. Collect payment and you’re done.
                </p>
              </Card>
              {payment ? (
                <PaymentCard payment={payment} audience="provider">
                  {payment.status === 'PENDING' ? (
                    <RecordPayment bookingId={booking.id} onRecorded={() => data.refresh()} />
                  ) : null}
                </PaymentCard>
              ) : null}
            </>
          ) : null}

          {booking.status === 'CANCELLED' ? (
            <Card>
              <h2 className="card__title">Booking cancelled</h2>
              <p className="body-text">This booking was cancelled.</p>
            </Card>
          ) : null}

          <Card>
            <h2 className="card__title">Progress</h2>
            <TrackingTimeline status={booking.status} timeline={booking.timeline} />
          </Card>

          {isLive ? (
            <Card>
              <h2 className="card__title">Location</h2>
              <LocationShare bookingId={booking.id} onUpdated={() => data.refresh()} disabled={Boolean(action.pending)} />
            </Card>
          ) : null}

          <Card>
            <h2 className="card__title">Private Notes</h2>
            <p className="field-hint">
              Visible only to you — work details, materials used, offline work, or reminders for this
              job.
            </p>
            <JobNotes jobId={booking.id} notesApi={bookingsApi.notes} />
          </Card>
        </div>

        <aside className="detail-layout__side">
          <Card>
            <h2 className="card__title">Customer &amp; job</h2>
            <DetailList
              items={[
                { label: 'Customer', value: booking.customer?.name },
                { label: 'Issue', value: request?.issueLabel },
                { label: 'Problem', value: request?.description },
                { label: 'Agreed price', value: formatMoney(booking.amount) },
                {
                  label: booking.scheduledDate ? 'Scheduled visit' : 'Preferred time',
                  value: booking.scheduledDate
                    ? formatSlot(booking.scheduledDate, booking.scheduledTime)
                    : request
                      ? formatSlot(request.preferredDate, request.preferredTime)
                      : '',
                },
              ]}
            />
            <h3 className="card__subtitle">Service address</h3>
            <AddressBlock address={request?.address} />
            {request?.attachments?.length ? (
              <>
                <h3 className="card__subtitle">Attachments</h3>
                <AttachmentList attachments={request.attachments} />
              </>
            ) : null}
            <VoiceNoteBlock voiceNote={request?.voiceNote} />
            <div className="card__actions">
              <ButtonLink to={`/bookings/${booking.id}/chat`} variant="secondary" block>
                Chat with customer
              </ButtonLink>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmContent)}
        title={confirmContent?.title}
        message={confirmContent?.message}
        confirmLabel={confirmContent?.confirmLabel}
        busy={Boolean(action.pending)}
        onConfirm={() => runners[confirm]()}
        onCancel={() => setConfirm(null)}
      />
    </AppShell>
  );
}

export default ProviderJobPage;
