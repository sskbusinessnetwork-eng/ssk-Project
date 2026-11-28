import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookUser,
  X,
  Phone,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { showInfo } from '../services/toastService';
import {
  parseVCardContacts,
  resolveContactSelection,
  type PickedContact,
  type ParsedVCardContact,
  type ContactPickerUnavailableReason,
  type ContactPickerRuntimeInfo
} from '../services/contactPickerService';

export type { PickedContact, ParsedVCardContact, ContactPickerUnavailableReason };
export { parseVCardContacts };

export async function pickPhoneFromContacts(
  onSelect: (phone: string) => void,
  onContactSelect?: (contact: PickedContact) => void,
  onUnavailable?: (
    reason: ContactPickerUnavailableReason,
    errorName?: string,
    runtime?: ContactPickerRuntimeInfo
  ) => void,
  onMultipleNumbers?: (contact: ParsedVCardContact) => void
): Promise<boolean> {
  const result = await resolveContactSelection();

  if (result.status === 'selected') {
    onSelect(result.contact.phone);
    if (onContactSelect) {
      onContactSelect(result.contact);
    }
    return true;
  }

  if (result.status === 'multiple_numbers') {
    if (onMultipleNumbers) {
      onMultipleNumbers({ name: result.name, phones: result.phones });
    } else {
      const firstPhone = result.phones[0];
      onSelect(firstPhone);
      if (onContactSelect) {
        onContactSelect({ phone: firstPhone, name: result.name });
      }
    }
    return true;
  }

  if (result.status === 'no_phone') {
    showInfo('Selected contact does not have a valid phone number saved.', {
      title: 'No Phone Number'
    });
    return true;
  }

  if (result.status === 'cancelled') {
    return true;
  }

  if (onUnavailable) {
    onUnavailable(result.reason, result.errorName, result.runtime);
  } else {
    const fallbackMessage =
      result.reason === 'permission_denied'
        ? 'Contacts permission was denied. Allow contacts access in your browser or app settings and try again, or enter the number manually.'
        : 'Direct device contact selection is not supported in this browser. Please enter the phone number manually.';
    showInfo(fallbackMessage, { title: 'Device Contacts Unavailable' });
  }
  return false;
}

type ModalNoticeReason = ContactPickerUnavailableReason | 'multiple_numbers';

interface ContactPickerFallbackModalProps {
  isOpen: boolean;
  reason: ModalNoticeReason;
  runtime?: ContactPickerRuntimeInfo | null;
  initialMultipleContact?: ParsedVCardContact | null;
  onClose: () => void;
  onPick: (contact: PickedContact) => void;
  onRetryNative?: () => void;
}

function getNoticeMessage(reason: ModalNoticeReason, runtime?: ContactPickerRuntimeInfo | null): string {
  if (reason === 'multiple_numbers') {
    return 'This device contact has multiple phone numbers. Tap the number you want to fill into the field.';
  }
  if (reason === 'iframe_blocked') {
    return 'Direct access to device contacts is blocked inside an embedded view. Open this website directly in your mobile browser (such as Chrome, Edge, or Samsung Internet on Android) to select a contact, or enter the phone number directly in the field.';
  }
  if (reason === 'permission_denied') {
    return 'Contacts permission was denied or restricted on this device. Allow contacts access in your browser or app settings and tap Try Again, or enter the phone number directly in the field.';
  }
  if (reason === 'blocked') {
    return 'Your browser blocked opening the device contacts picker. Allow access and tap Try Again, or enter the phone number directly in the field.';
  }
  if (runtime && !runtime.isSecureContext) {
    return 'Direct device contact access requires a secure HTTPS connection. Open this site over HTTPS on a supported mobile browser, or enter the phone number directly in the field.';
  }
  if (runtime?.isIOS) {
    return 'This iOS browser does not allow direct access to device contacts by default. In Safari on iOS, you can enable "Contact Picker API" under Settings → Safari → Advanced → Feature Flags (or Experimental Features). Otherwise, please enter the phone number directly in the field.';
  }
  if (runtime?.isAndroid) {
    return 'Direct device contact selection is not supported in this Android browser or WebView. Open this website in Google Chrome, Microsoft Edge, Samsung Internet, or the SSK Android app to pick from your device contacts, or enter the phone number directly in the field.';
  }
  return 'Direct device contact selection is not supported by this browser. Native contact picking is available on supported mobile browsers (such as Chrome, Edge, or Samsung Internet on Android) or the SSK mobile app. Please enter the phone number directly in the field.';
}

function ContactPickerFallbackModal({
  isOpen,
  reason,
  runtime = null,
  initialMultipleContact = null,
  onClose,
  onPick,
  onRetryNative
}: ContactPickerFallbackModalProps) {
  const hasPickedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    hasPickedRef.current = false;
  }, [isOpen, initialMultipleContact]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const commitPickAndClose = (contact: PickedContact) => {
    if (hasPickedRef.current) return;
    hasPickedRef.current = true;
    onPick(contact);
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isMultiNumberPrompt =
    reason === 'multiple_numbers' &&
    Boolean(initialMultipleContact && initialMultipleContact.phones.length > 0);
  const canRetryNativePicker =
    Boolean(onRetryNative) &&
    (reason === 'permission_denied' || reason === 'blocked') &&
    Boolean(runtime?.hasNativeBridge || runtime?.hasWebContactPicker);

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-primary shrink-0" />

        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <BookUser size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white truncate">
                {isMultiNumberPrompt ? 'Select Phone Number' : 'Device Contacts Unavailable'}
              </h3>
              <p className="text-[11px] text-neutral-400 truncate">
                {isMultiNumberPrompt
                  ? 'Choose which number from this contact to use'
                  : 'Native contact picker limitation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close contact picker"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {!isMultiNumberPrompt && (
            <div className="p-3.5 rounded-xl bg-[#151C2E] border border-white/10 flex items-start gap-2.5 text-xs text-neutral-200 leading-relaxed">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-3 flex-1">
                <p>{getNoticeMessage(reason, runtime)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {canRetryNativePicker && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRetryNative?.();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      Try Again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-200 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {isMultiNumberPrompt && initialMultipleContact && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Device Contact Numbers
              </p>

              <div className="p-2.5 rounded-xl bg-[#151C2E] border border-white/10 space-y-1.5">
                <p className="text-xs font-bold text-white">{initialMultipleContact.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {initialMultipleContact.phones.map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() =>
                        commitPickAndClose({ phone: ph, name: initialMultipleContact.name })
                      }
                      className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Phone size={11} />
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              {onRetryNative && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRetryNative();
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Pick another contact
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface ContactPickerButtonProps {
  onSelect: (phone: string) => void;
  onContactSelect?: (contact: PickedContact) => void;
  disabled?: boolean;
  className?: string;
}

export function ContactPickerButton({
  onSelect,
  onContactSelect,
  disabled = false,
  className
}: ContactPickerButtonProps) {
  const [fallbackState, setFallbackState] = useState<{
    open: boolean;
    reason: ModalNoticeReason;
    runtime: ContactPickerRuntimeInfo | null;
    initialMultipleContact: ParsedVCardContact | null;
  }>({
    open: false,
    reason: 'unsupported',
    runtime: null,
    initialMultipleContact: null
  });
  const isPickingRef = useRef(false);

  useEffect(() => {
    return () => {
      isPickingRef.current = false;
    };
  }, []);

  const startContactSelection = () => {
    if (disabled || isPickingRef.current) return;

    isPickingRef.current = true;
    void pickPhoneFromContacts(
      onSelect,
      onContactSelect,
      (reason, _errorName, runtime) => {
        setFallbackState({
          open: true,
          reason,
          runtime: runtime ?? null,
          initialMultipleContact: null
        });
      },
      (multiContact) => {
        setFallbackState({
          open: true,
          reason: 'multiple_numbers',
          runtime: null,
          initialMultipleContact: multiContact
        });
      }
    ).finally(() => {
      isPickingRef.current = false;
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startContactSelection();
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors text-neutral-400 hover:text-primary hover:bg-white/5 z-10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
          className
        )}
        title="Select from device contacts"
        aria-label="Select contact from device phonebook"
      >
        <BookUser size={17} />
      </button>

      <ContactPickerFallbackModal
        isOpen={fallbackState.open}
        reason={fallbackState.reason}
        runtime={fallbackState.runtime}
        initialMultipleContact={fallbackState.initialMultipleContact}
        onClose={() =>
          setFallbackState((prev) => ({
            ...prev,
            open: false,
            initialMultipleContact: null
          }))
        }
        onRetryNative={startContactSelection}
        onPick={(contact) => {
          onSelect(contact.phone);
          if (onContactSelect) {
            onContactSelect(contact);
          }
        }}
      />
    </>
  );
}

interface PhoneInputWithPickerProps {
  value: string;
  onChange: (value: string) => void;
  onContactSelect?: (contact: PickedContact) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  icon?: React.ReactNode;
  name?: string;
  id?: string;
}

export function PhoneInputWithPicker({
  value,
  onChange,
  onContactSelect,
  onBlur,
  placeholder,
  className,
  required = false,
  disabled = false,
  readOnly = false,
  icon,
  name,
  id
}: PhoneInputWithPickerProps) {
  return (
    <div className="relative w-full">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">{icon}</div>}
      <input
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(icon ? 'pl-9' : 'pl-4', className, 'w-full pr-11')}
      />
      <ContactPickerButton
        disabled={disabled || readOnly}
        onSelect={(phone) => onChange(phone)}
        onContactSelect={onContactSelect}
      />
    </div>
  );
}
