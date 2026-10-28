import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  isOpen?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  backdropClassName?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen = true,
  onClose,
  children,
  backdropClassName = '',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto bg-slate-950/75 backdrop-blur-xs print:p-0 print:bg-white print:overflow-visible ${backdropClassName}`}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default ModalPortal;
