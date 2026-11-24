import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookUser,
  Search,
  X,
  Upload,
  ClipboardPaste,
  Phone,
  Users,
  Building2,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { normalizePhoneDigits, normalizePickedPhoneNumber } from '../utils/phoneUtils';
import { showInfo, showSuccess, showError } from '../services/toastService';
import { supabase } from '../lib/supabaseClient';
import { extractMemberExtraData } from './OfflineReferralMemberSelect';
import { getCleanFullName } from '../utils/authUtils';
import {
  parseVCardContacts,
  resolveContactSelection,
  type PickedContact,
  type ParsedVCardContact,
  type ContactPickerUnavailableReason
} from '../services/contactPickerService';

export type { PickedContact, ParsedVCardContact, ContactPickerUnavailableReason };
export { parseVCardContacts };

export async function pickPhoneFromContacts(
  onSelect: (phone: string) => void,
  onContactSelect?: (contact: PickedContact) => void,
  onUnavailable?: (reason: ContactPickerUnavailableReason, errorName?: string) => void,
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
    onUnavailable(result.reason, result.errorName);
  } else {
    const fallbackMessage =
      result.reason === 'permission_denied'
        ? 'Contacts permission was denied. Allow access or use .vcf / Paste Number.'
        : 'Unable to open device contacts directly in this view.';
    showInfo(fallbackMessage, { title: 'Contacts Unavailable' });
  }
  return false;
}

interface DirectoryContactItem {
  id: string;
  name: string;
  phone: string;
  category: string;
  chapterName: string;
}

type ModalNoticeReason = ContactPickerUnavailableReason | 'multiple_numbers';

interface ContactPickerFallbackModalProps {
  isOpen: boolean;
  reason: ModalNoticeReason;
  initialMultipleContact?: ParsedVCardContact | null;
  onClose: () => void;
  onPick: (contact: PickedContact) => void;
}

function getNoticeMessage(reason: ModalNoticeReason): string {
  if (reason === 'multiple_numbers') {
    return 'This contact has multiple phone numbers. Tap the number you want to use below, or import/pick another contact.';
  }
  if (reason === 'iframe_blocked') {
    return 'Direct phonebook popup is blocked inside this embedded browser view. Import a contact card (.vcf), paste a copied number, or pick from the SSK Member Directory below.';
  }
  if (reason === 'permission_denied') {
    return 'Contacts permission was denied or restricted on this device. Allow contacts permission in browser/app settings, or import a contact card (.vcf), paste a number, or pick from the SSK Member Directory below.';
  }
  if (reason === 'blocked') {
    return 'Direct phonebook popup is restricted by this browser or WebView on your device. Import a contact card (.vcf), paste a copied number, or pick from the SSK Member Directory below.';
  }
  return 'Your browser or WebView does not support direct native phonebook popup (supported on Android Chrome/Edge or native app bridge). Import a contact card (.vcf), paste a copied number, or pick from the SSK Member Directory below.';
}

function ContactPickerFallbackModal({
  isOpen,
  reason,
  initialMultipleContact = null,
  onClose,
  onPick
}: ContactPickerFallbackModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<DirectoryContactItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [vcardContacts, setVcardContacts] = useState<ParsedVCardContact[]>([]);
  const [manualPasteValue, setManualPasteValue] = useState('');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const vcardInputRef = useRef<HTMLInputElement>(null);
  const hasPickedRef = useRef(false);

  const commitPickAndClose = (contact: PickedContact) => {
    if (hasPickedRef.current) return;
    hasPickedRef.current = true;
    onPick(contact);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      hasPickedRef.current = false;
      setSearchQuery('');
      setVcardContacts([]);
      setManualPasteValue('');
      setShowManualPaste(false);
      return;
    }

    hasPickedRef.current = false;
    if (initialMultipleContact && initialMultipleContact.phones.length > 0) {
      setVcardContacts([initialMultipleContact]);
    } else {
      setVcardContacts([]);
    }

    let isMounted = true;
    const loadDirectoryContacts = async () => {
      setLoadingMembers(true);
      try {
        const [usersRes, chaptersRes, categoriesRes] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('chapters').select('id, chapter_name'),
          supabase.from('categories').select('id, name')
        ]);

        const chapMap = new Map<string, string>();
        if (chaptersRes.data) {
          chaptersRes.data.forEach((c: any) => {
            if (c.id) chapMap.set(String(c.id).trim().toLowerCase(), c.chapter_name || '');
          });
        }

        const catMap = new Map<string, string>();
        if (categoriesRes.data) {
          categoriesRes.data.forEach((cat: any) => {
            if (cat.id && cat.name) catMap.set(String(cat.id).trim().toLowerCase(), String(cat.name));
          });
        }

        if (isMounted && usersRes.data) {
          const parsed: DirectoryContactItem[] = usersRes.data
            .filter((u: any) => String(u.role || '').toUpperCase() !== 'MASTER_ADMIN')
            .map((u: any) => {
              const extra = extractMemberExtraData(u.profile_photo || u.photo_url || u.photoURL || '');
              const rawPhone = String(u.phone || extra.phone || '').trim();
              const normalizedPhone = normalizePickedPhoneNumber(rawPhone) || normalizePhoneDigits(rawPhone) || rawPhone;
              const chapId = String(u.chapter_id || extra.chapter_id || '').trim().toLowerCase();
              const chapName = (chapId && chapMap.get(chapId)) || u.chapter_name || extra.chapter_name || 'Chapter Member';
              const rawCatId = String(u.category_id || extra.category_id || '').trim().toLowerCase();
              const mappedCat = rawCatId ? catMap.get(rawCatId) || '' : '';
              const category = String(
                u.category ||
                  extra.category ||
                  u.business_category ||
                  extra.business_category ||
                  u.businessCategory ||
                  extra.businessCategory ||
                  mappedCat ||
                  u.business_name ||
                  u.businessName ||
                  extra.business_name ||
                  extra.businessName ||
                  u.profession_designation ||
                  extra.profession_designation ||
                  'Business Owner'
              ).trim();

              return {
                id: String(u.id || u.uid),
                name: getCleanFullName(u.name || u.full_name || extra.name || ''),
                phone: normalizedPhone,
                category,
                chapterName: chapName
              };
            })
            .filter((m) => Boolean(m.phone && m.phone.replace(/\D/g, '').length >= 7))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

          setMembers(parsed);
        }
      } catch (err) {
        console.warn('Could not load member directory contacts:', err);
      } finally {
        if (isMounted) setLoadingMembers(false);
      }
    };

    loadDirectoryContacts();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialMultipleContact]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.chapterName.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const handleVCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
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

      setVcardContacts(parsed);
    } catch {
      showError('Could not read the selected contact file.');
    }
  };

  const handleClipboardPaste = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        const normalized = normalizePickedPhoneNumber(text);
        if (normalized) {
          showSuccess('Phone number pasted from clipboard');
          commitPickAndClose({ phone: normalized });
          return;
        }
        if (text && text.trim()) {
          showInfo('Clipboard text did not contain a valid phone number. Paste it manually below.');
        } else {
          showInfo('Clipboard is empty. Copy a number from your phonebook first.');
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

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white"
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
                Select Contact
              </h3>
              <p className="text-[11px] text-neutral-400 truncate">
                Import from phonebook or pick a member
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
          {/* Context Notice */}
          <div className="p-3 rounded-xl bg-[#151C2E] border border-white/10 flex items-start gap-2.5 text-[11px] text-neutral-300 leading-relaxed">
            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <span>{getNoticeMessage(reason)}</span>
          </div>

          {/* Quick Actions: Import vCard (.vcf) & Paste Clipboard */}
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

          {showManualPaste && (
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

          {/* Selected Multi-Number Contact / Imported vCard Matches */}
          {vcardContacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {reason === 'multiple_numbers' && vcardContacts.length === 1
                    ? 'Select Phone Number'
                    : `Imported Contacts (${vcardContacts.length})`}
                </p>
                <button
                  type="button"
                  onClick={() => setVcardContacts([])}
                  className="text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {vcardContacts.map((vc, idx) => (
                  <div key={`${vc.name}-${idx}`} className="p-2.5 rounded-xl bg-[#151C2E] border border-white/10 space-y-1.5">
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
                ))}
              </div>
            </div>
          )}

          {/* In-App Member Phonebook */}
          <div className="space-y-2.5 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Users size={13} className="text-primary" />
                Member Phonebook ({filteredMembers.length})
              </p>
            </div>

            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member name, mobile, category, or chapter..."
                className="w-full h-9 pl-8 pr-8 rounded-xl bg-[#151C2E] border border-white/10 text-xs text-white placeholder-neutral-400 outline-none focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
              {loadingMembers ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <Loader2 size={15} className="animate-spin text-primary" />
                  <span>Loading member phonebook...</span>
                </div>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => commitPickAndClose({ phone: m.phone, name: m.name })}
                    className="w-full text-left p-2.5 rounded-xl bg-[#151C2E]/70 hover:bg-[#1A2236] border border-white/5 hover:border-primary/40 transition-all flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{m.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 truncate mt-0.5">
                        <span className="text-emerald-400 font-semibold truncate">{m.category}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <Building2 size={10} />
                          {m.chapterName}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-primary shrink-0 bg-primary/10 px-2 py-1 rounded-lg">
                      {m.phone}
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-neutral-400">
                  No members found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
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
    initialMultipleContact: ParsedVCardContact | null;
  }>({
    open: false,
    reason: 'unsupported',
    initialMultipleContact: null
  });
  const isPickingRef = useRef(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isPickingRef.current) return;

    isPickingRef.current = true;
    void pickPhoneFromContacts(
      onSelect,
      onContactSelect,
      (reason) => {
        setFallbackState({ open: true, reason, initialMultipleContact: null });
      },
      (multiContact) => {
        setFallbackState({
          open: true,
          reason: 'multiple_numbers',
          initialMultipleContact: multiContact
        });
      }
    ).finally(() => {
      isPickingRef.current = false;
    });
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
        title="Select from contacts / phonebook"
        aria-label="Select contact from phone book"
      >
        <BookUser size={17} />
      </button>

      <ContactPickerFallbackModal
        isOpen={fallbackState.open}
        reason={fallbackState.reason}
        initialMultipleContact={fallbackState.initialMultipleContact}
        onClose={() =>
          setFallbackState((prev) => ({
            ...prev,
            open: false,
            initialMultipleContact: null
          }))
        }
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
