import React from 'react';
import { BookUser } from 'lucide-react';
import { cn } from '../lib/utils';
import { normalizePhoneDigits } from '../utils/phoneUtils';
import { showInfo } from '../services/toastService';

export async function pickPhoneFromContacts(onSelect: (phone: string) => void): Promise<void> {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  const isSupported = Boolean(nav && 'contacts' in nav && nav.contacts && typeof nav.contacts.select === 'function');

  if (!isSupported) {
    showInfo('Contact picker is supported on mobile devices. Please enter the phone number manually.', {
      title: 'Contacts Unavailable'
    });
    return;
  }

  try {
    const contacts = await nav.contacts.select(['tel'], { multiple: false });
    if (contacts && contacts.length > 0) {
      const contact = contacts[0];
      if (contact?.tel && contact.tel.length > 0) {
        const rawTel = String(contact.tel[0] || '').trim();
        if (rawTel) {
          const normalized = normalizePhoneDigits(rawTel);
          onSelect(normalized || rawTel);
        }
      }
    }
  } catch (err: any) {
    if (err?.name === 'SecurityError' || err?.name === 'NotSupportedError' || err?.name === 'InvalidStateError') {
      showInfo('Unable to open device contacts in this browser view. Please enter the phone number manually.', {
        title: 'Contacts Unavailable'
      });
    }
  }
}

interface ContactPickerButtonProps {
  onSelect: (phone: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ContactPickerButton({ onSelect, disabled = false, className }: ContactPickerButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          pickPhoneFromContacts(onSelect);
        }
      }}
      className={cn(
        'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors text-neutral-400 hover:text-primary hover:bg-white/5 z-10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      title="Select from contacts"
      aria-label="Select contact from phone book"
    >
      <BookUser size={17} />
    </button>
  );
}

interface PhoneInputWithPickerProps {
  value: string;
  onChange: (value: string) => void;
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
      />
    </div>
  );
}
