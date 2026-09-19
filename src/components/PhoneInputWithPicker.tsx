import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface PhoneInputWithPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  icon?: React.ReactNode;
  name?: string;
}

export function PhoneInputWithPicker({
  value,
  onChange,
  placeholder,
  className,
  required = false,
  icon,
  name
}: PhoneInputWithPickerProps) {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for Contact Picker API support
    // @ts-ignore
    setIsSupported('contacts' in navigator && 'select' in navigator.contacts);
  }, []);

  const handlePickContact = async () => {
    if (!isSupported) {
      alert('Contact picker is not supported in this browser. Please enter the phone number manually.');
      return;
    }

    try {
      const props = ['tel'];
      const opts = { multiple: false };
      // @ts-ignore
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        if (contact.tel && contact.tel.length > 0) {
          // Select the first available number
          onChange(contact.tel[0]);
        }
      }
    } catch (err) {
      console.error('Contact picker failed:', err);
      // If permission is denied or user cancels, manual entry remains available.
    }
  };

  return (
    <div className="relative w-full">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</div>}
      <input
        name={name}
        required={required}
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full pr-12", icon ? "pl-9" : "pl-4", className)}
      />
      <button
        type="button"
        onClick={handlePickContact}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-neutral-700 rounded-full transition-colors text-neutral-400 hover:text-white z-10"
        title="Select from contacts"
      >
        <Users size={18} />
      </button>
    </div>
  );
}
