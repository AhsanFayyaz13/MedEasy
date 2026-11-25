import { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBellOff,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiFileText,
  FiInfo,
  FiMessageCircle,
  FiStar,
  FiXCircle,
} from 'react-icons/fi';
import { Button, Modal } from '../../ui';

const ICONS = {
  welcome: { icon: FiCheckCircle, tone: 'primary' },
  system: { icon: FiInfo, tone: 'primary' },
  star: { icon: FiStar, tone: 'warning' },
  review: { icon: FiStar, tone: 'warning' },
  cancel: { icon: FiXCircle, tone: 'error' },
  chat: { icon: FiMessageCircle, tone: 'primary' },
  booking: { icon: FiCalendar, tone: 'accent' },
  prescription: { icon: FiFileText, tone: 'warning' },
};

export function NotificationIcon({ type }) {
  const { icon: Icon, tone } = ICONS[type] || { icon: FiBell, tone: 'primary' };
  return (
    <span className={`nav-notif__icon nav-notif__icon--${tone}`} aria-hidden="true">
      <Icon />
    </span>
  );
}

const timeLabel = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function NotificationsMenu({ notifications, unreadCount, markAllRead, markAsRead, onNavigate }) {
  const navigate = useNavigate();
  const [viewing, setViewing] = useState(null);

  const open = (n) => {
    markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      onNavigate?.();
    } else {
      setViewing(n);
    }
  };

  return (
    <>
      <Dropdown align="end">
        <Dropdown.Toggle
          as="button"
          type="button"
          className="nav-icon-btn"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <FiBell aria-hidden="true" />
          {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </Dropdown.Toggle>

        <Dropdown.Menu className="nav-notif">
          <div className="nav-notif__head">
            <span className="nav-notif__title">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="nav-notif__mark" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="nav-notif__list">
            {notifications.length === 0 ? (
              <div className="nav-notif__empty">
                <FiBellOff aria-hidden="true" />
                <p>You’re all caught up.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`nav-notif__item${n.unread ? ' is-unread' : ''}`}>
                  <button type="button" className="nav-notif__open" onClick={() => open(n)}>
                    <NotificationIcon type={n.emoji} />
                    <span className="nav-notif__body">
                      <span className="nav-notif__text">{n.text}</span>
                      <span className="nav-notif__time">{timeLabel(n.time)}</span>
                    </span>
                  </button>
                  {n.unread && (
                    <button
                      type="button"
                      className="ui-icon-btn ui-icon-btn--sm"
                      title="Mark as read"
                      aria-label="Mark as read"
                      onClick={() => markAsRead(n.id)}
                    >
                      <FiCheck aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </Dropdown.Menu>
      </Dropdown>

      <Modal show={!!viewing} onClose={() => setViewing(null)} size="sm" title="Notification">
        {viewing && (
          <div className="text-center">
            <div className="d-flex justify-content-center mb-3">
              <NotificationIcon type={viewing.emoji} />
            </div>
            <p className="mb-2">{viewing.text}</p>
            <small className="text-muted">
              {new Date(viewing.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </small>
            {viewing.link && (
              <Button
                block
                className="mt-4"
                onClick={() => {
                  navigate(viewing.link);
                  setViewing(null);
                  onNavigate?.();
                }}
              >
                Go to details
              </Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
