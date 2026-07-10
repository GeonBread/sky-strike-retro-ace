import { HobanwooSpriteButton } from "./buttons/HobanwooSpriteButton";
import "./notificationDialog.css";

type NotificationDialogProps = {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function NotificationDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: NotificationDialogProps) {
  if (!open) return null;

  return (
    <div className="hobanwooNotificationDim" role="presentation" onMouseDown={onCancel}>
      <section
        className="hobanwooNotificationPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hobanwoo-notification-title"
        aria-describedby="hobanwoo-notification-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="hobanwooNotificationContent">
          <div className="hobanwooNotificationEyebrow">NOTICE</div>
          <h2 id="hobanwoo-notification-title">{title}</h2>
          <p id="hobanwoo-notification-message">{message}</p>

          <div className="hobanwooNotificationActions">
            <HobanwooSpriteButton variant="cancel" onClick={onCancel} />
            <HobanwooSpriteButton variant="confirm" onClick={onConfirm} />
          </div>
        </div>
      </section>
    </div>
  );
}
