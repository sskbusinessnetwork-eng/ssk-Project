import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookUser,
  Search,
  X,
  Upload,
  ClipboardPaste,
  Phone,
  AlertCircle,
  Check,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { normalizePickedPhoneNumber } from '../utils/phoneUtils';
import { showInfo, showSuccess, showError } from '../services/toastService';
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
        ? 'Contacts permission was denied. Allow access or import a .vcf contact card.'
        : 'Unable to open device contacts directly in this view.';
    showInfo(fallbackMessage, { title: 'Contacts Unavailable' });
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
    return 'Direct device contacts popup is blocked inside an embedded view. Open the site directly in your mobile browser, or import a contact card (.vcf) or paste a number from your device contacts below.';
  }
  if (reason === 'permission_denied') {
    return 'Contacts permission was denied or restricted on this device. Allow contacts access in your browser or app settings and tap Try Again, or import a contact card (.vcf) or paste a number below.';
  }
  if (reason === 'blocked') {
    return 'Your browser blocked opening the device contacts picker. Allow access and tap Try Again, or import a contact card (.vcf) or paste a number below.';
  }
  if (runtime?.isIOS) {
    return 'Your iOS browser does not allow direct system contacts popup by default. Tap Import Contact (.vcf) to pick a contact card from Files (Contacts → Share Contact → Save to Files), or paste a copied number below.';
  }
  if (runtime?.isAndroid) {
    return 'Direct contacts popup is not supported in this Android browser or WebView. Choose a contact card (.vcf) exported from your Contacts app, or paste a copied number below.';
  }
  return 'This desktop browser does not support direct system contacts popups. Drag & drop or import a contact card (.vcf) from your device contacts (e.g. Apple/Google Contacts), or paste a copied number below.';
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
  const [vcardContacts, setVcardContacts] = useState<ParsedVCardContact[]>([]);
  const [vcardSearch, setVcardSearch] = useState('');
  const [manualPasteValue, setManualPasteValue] = useState('');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [isDraggingVcf, setIsDraggingVcf] = useState(false);
  const vcardInputRef = useRef<HTMLInputElement>(null);
  const hasPickedRef = useRef(false);

  const commitPickAndClose = (contact: PickedContact) => {
    if (hasPickedRef.current) return;
    hasPickedRef.current = true;
    onPick(contact);
    onClose();
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      hasPickedRef.current = false;
      setVcardSearch('');
      setVcardContacts([]);
      setManualPasteValue('');
      setShowManualPaste(false);
      setIsDraggingVcf(false);
      return;
    }

    hasPickedRef.current = false;
    setVcardSearch('');
    setIsDraggingVcf(false);
    if (initialMultipleContact && initialMultipleContact.phones.length > 0) {
      setVcardContacts([initialMultipleContact]);
    } else {
      setVcardContacts([]);
    }
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

  const filteredVcardContacts = useMemo(() => {
    if (!vcardSearch.trim()) return vcardContacts;
    const q = vcardSearch.toLowerCase().trim();
    return vcardContacts.filter(
      (vc) =>
        vc.name.toLowerCase().includes(q) ||
        vc.phones.some((ph) => ph.toLowerCase().includes(q))
    );
  }, [vcardContacts, vcardSearch]);

  const processVCardText = (text: string) => {
    const parsed = parseVCardContacts(text);
    if (parsed.length === 0) {
      showError('No valid phone numbers were found in that contact card (.vcf).');
      return;
    }

    if (parsed.length === 1 && parsed[0].phones.length === 1) {
      showSuccess(`Selected ${parsed[0].name}`);
      commitPickAndClose({ phone: parsed[0].phones[0], name: parsed[0].name });
      return;
    }

    setVcardSearch('');
    setVcardContacts(parsed);
  };

  const handleVCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      processVCardText(text);
    } catch {
      showError('Could not read the selected contact file.');
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingVcf(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        processVCardText(text);
        return;
      } catch {
        showError('Could not read the dropped contact file.');
        return;
      }
    }

    const vcardText =
      e.dataTransfer?.getData('text/vcard') ||
      e.dataTransfer?.getData('text/x-vcard') ||
      e.dataTransfer?.getData('text/plain');
    if (vcardText && /BEGIN:VCARD/i.test(vcardText)) {
      processVCardText(vcardText);
    } else if (vcardText) {
      const normalized = normalizePickedPhoneNumber(vcardText);
      if (normalized) {
        commitPickAndClose({ phone: normalized });
      }
    }
  };

  const handleClipboardPaste = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text && /BEGIN:VCARD/i.test(text)) {
          processVCardText(text);
          return;
        }
        const normalized = normalizePickedPhoneNumber(text);
        if (normalized) {
          showSuccess('Phone number pasted from clipboard');
          commitPickAndClose({ phone: normalized });
          return;
        }
        if (text && text.trim()) {
          showInfo('Clipboard text did not contain a valid phone number. Paste it manually below.');
        } else {
          showInfo('Clipboard is empty. Copy a number from your device contacts first.');
        }
      }
      setShowManualPaste(true);
    } catch {
      setShowManualPaste(true);
    }
  };

  const handleApplyManualPaste = () => {
    const normalized = normalizePickedPhoneNumber(manualPasteValue);
    if (!normalized) {
      showError('Please enter or paste a valid phone number.');
      return;
    }
    commitPickAndClose({ phone: normalized });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isMultiNumberPrompt = reason === 'multiple_numbers' && vcardContacts.length > 0;
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
        className={cn(
          'w-full max-w-md bg-[#111827] border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white transition-colors',
          isDraggingVcf ? 'border-primary ring-2 ring-primary/40' : 'border-white/10'
        )}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDraggingVcf) setIsDraggingVcf(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingVcf(false);
        }}
        onDrop={handleDrop}
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
                {isMultiNumberPrompt ? 'Select Phone Number' : 'Device Contacts'}
              </h3>
              <p className="text-[11px] text-neutral-400 truncate">
                {isMultiNumberPrompt
                  ? 'Choose which number from this contact to use'
                  : 'Select a contact from your device'}
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
          {/* Context Notice (shown when native picker could not open directly) */}
          {!isMultiNumberPrompt && (
            <div className="p-3 rounded-xl bg-[#151C2E] border border-white/10 flex items-start gap-2.5 text-[11px] text-neutral-300 leading-relaxed">
              <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p>{getNoticeMessage(reason, runtime)}</p>
                {canRetryNativePicker && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRetryNative?.();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Try Device Contacts Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Device Contact Card (.vcf) & Paste Clipboard Actions */}
          {!isMultiNumberPrompt && (
            <div className="grid grid-cols-2 gap-2.5">
              <input
                ref={vcardInputRef}
                type="file"
                accept=".vcf,text/vcard,text/x-vcard,text/x-vCard,text/directory,application/vcard"
                onChange={handleVCardFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => vcardInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
              >
                <Upload size={14} className="shrink-0" />
                <span>Import Contact (.vcf)</span>
              </button>

              <button
                type="button"
                onClick={handleClipboardPaste}
                className="py-2.5 px-3 rounded-xl bg-[#151C2E] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 hover:border-primary/50 hover:bg-[#1A2236] transition-all cursor-pointer"
              >
                <ClipboardPaste size={14} className="shrink-0 text-primary" />
                <span>Paste Number</span>
              </button>
            </div>
          )}

          {showManualPaste && !isMultiNumberPrompt && (
            <div className="p-3 rounded-xl bg-[#151C2E] border border-primary/30 space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Paste Copied Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  autoFocus
                  value={manualPasteValue}
                  onChange={(e) => setManualPasteValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyManualPaste();
                    }
                  }}
                  placeholder="Long-press / Ctrl+V to paste..."
                  className="flex-1 px-3 py-2 rounded-lg bg-[#111827] border border-white/10 text-white text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleApplyManualPaste}
                  className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 cursor-pointer flex items-center gap-1"
                >
                  <Check size={13} />
                  Use
                </button>
              </div>
            </div>
          )}

          {/* Selected Multi-Number Contact / Imported Device vCard Contacts */}
          {vcardContacts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {isMultiNumberPrompt
                    ? 'Device Contact Numbers'
                    : `Device Contacts (${filteredVcardContacts.length})`}
                </p>
                {!isMultiNumberPrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setVcardContacts([]);
                      setVcardSearch('');
                    }}
                    className="text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {!isMultiNumberPrompt && vcardContacts.length > 5 && (
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    value={vcardSearch}
                    onChange={(e) => setVcardSearch(e.target.value)}
                    placeholder="Search imported device contacts..."
                    className="w-full h-9 pl-8 pr-8 rounded-xl bg-[#151C2E] border border-white/10 text-xs text-white placeholder-neutral-400 outline-none focus:border-primary"
                  />
                  {vcardSearch && (
                    <button
                      type="button"
                      onClick={() => setVcardSearch('')}
                      className="absolute right-2.5 p-0.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {filteredVcardContacts.length > 0 ? (
                  filteredVcardContacts.map((vc, idx) => (
                    <div
                      key={`${vc.name}-${idx}`}
                      className="p-2.5 rounded-xl bg-[#151C2E] border border-white/10 space-y-1.5"
                    >
                      <p className="text-xs font-bold text-white">{vc.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vc.phones.map((ph) => (
                          <button
                            key={ph}
                            type="button"
                            onClick={() => commitPickAndClose({ phone: ph, name: vc.name })}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-[11px] font-bold hover:bg-primary hover:text-white transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Phone size={11} />
                            {ph}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-neutral-400">
                    No contacts matching "{vcardSearch}"
                  </div>
                )}
              </div>

              {isMultiNumberPrompt && onRetryNative && (
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
