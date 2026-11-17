import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-light"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </>
      }
    >
      <p className="mb-0 text-muted-custom">{message}</p>
    </Modal>
  );
}
