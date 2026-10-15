
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Store,
  Send,
  CheckCircle,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';

import client from '../../api/client.js';
import { useStoreSettings } from '../../context/StoreSettingsContext';

const INITIAL_CONTACT_FORM = {
  name: '',
  contact_number: '',
  query: '',
};

function formatBusinessTime(time) {
  if (!time) return '';

  const [hours, minutes = '00'] = String(time).split(':');
  const hour = Number(hours);

  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    return String(time);
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;

  return `${String(formattedHour).padStart(2, '0')}:${minutes} ${period}`;
}

function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

function getApiPayload(response) {
  return response?.data ?? response;
}

export default function CMSPage({ slug = 'contact', onNavigate }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const { storeSettings: settings } = useStoreSettings();

  const [contactForm, setContactForm] = useState(INITIAL_CONTACT_FORM);
  const [contactErrors, setContactErrors] = useState({});
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactMessage, setContactMessage] = useState({
    type: '',
    text: '',
  });

  const isContact = slug === 'contact';

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);
      setPageError('');

      try {
        const response = await client.get(
          `/cms/pages/${encodeURIComponent(slug)}`
        );

        const result = getApiPayload(response);

        if (!active) return;

        if (result?.success && result?.data) {
          setPage(result.data);
        } else {
          setPage(null);

          if (!isContact) {
            setPageError(
              result?.message || 'Page content could not be loaded.'
            );
          }
        }
      } catch (error) {
        if (!active) return;

        console.warn('Failed to load CMS content:', error);

        setPage(null);

        if (!isContact) {
          setPageError(
            error?.response?.data?.message ||
              'Unable to load this page. Please try again.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [slug, isContact]);

  function validateContactForm() {
    const errors = {};

    const name = contactForm.name.trim();
    const phone = contactForm.contact_number.trim();
    const query = contactForm.query.trim();

    if (!name) {
      errors.name = 'Please enter your name.';
    } else if (name.length < 2) {
      errors.name = 'Name must contain at least 2 characters.';
    } else if (name.length > 100) {
      errors.name = 'Name cannot exceed 100 characters.';
    } else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(name)) {
      errors.name = 'Please enter a valid name.';
    }

    if (!phone) {
      errors.contact_number = 'Please enter your contact number.';
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.contact_number =
        'Enter a valid 10-digit Indian mobile number.';
    }

    if (!query) {
      errors.query = 'Please enter your query.';
    } else if (query.length < 8) {
      errors.query = 'Your query must contain at least 8 characters.';
    } else if (query.length > 2000) {
      errors.query = 'Your query cannot exceed 2000 characters.';
    }

    setContactErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleContactChange(event) {
    const { name, value } = event.target;

    const nextValue =
      name === 'contact_number'
        ? value.replace(/\D/g, '').slice(0, 10)
        : value;

    setContactForm((previous) => ({
      ...previous,
      [name]: nextValue,
    }));

    setContactErrors((previous) => ({
      ...previous,
      [name]: '',
    }));

    setContactMessage({ type: '', text: '' });
  }

  async function handleContactSubmit(event) {
    event.preventDefault();

    setContactMessage({ type: '', text: '' });

    if (contactSubmitting) return;
    if (!validateContactForm()) return;

    setContactSubmitting(true);

    try {
      const response = await client.post('/contacts', {
        name: contactForm.name.trim(),
        contact_number: contactForm.contact_number,
        query: contactForm.query.trim(),
      });

      const result = getApiPayload(response);

      if (result?.success === false) {
        throw new Error(
          result.message || 'Unable to submit your query.'
        );
      }

      setContactMessage({
        type: 'success',
        text:
          result?.message ||
          'Thank you! Your query has been submitted successfully.',
      });

      setContactForm({ ...INITIAL_CONTACT_FORM });
      setContactErrors({});
    } catch (error) {
      console.error('Contact form submission failed:', error);

      setContactMessage({
        type: 'error',
        text:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to submit your query. Please try again.',
      });
    } finally {
      setContactSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 py-24 text-sm text-slate-500">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading page content...
      </div>
    );
  }

  const storeName = settings?.store_name || 'Our Store';
  const storeAddress = settings?.store_address || '';
  const storeMobile = settings?.store_mobile || '';
  const storeEmail = settings?.store_email || '';
  const storeGst = settings?.store_gst || '';

  const whatsappNumber = normalizeWhatsAppNumber(
    settings?.store_whatsapp || settings?.admin_whatsapp_number
  );

  const whatsappDisplay =
    settings?.store_whatsapp || settings?.admin_whatsapp_number || '';

  const openingTime = formatBusinessTime(settings?.store_opening_time);
  const closingTime = formatBusinessTime(settings?.store_closing_time);

  const businessHours =
    openingTime && closingTime
      ? `Daily: ${openingTime} - ${closingTime}`
      : '';

  const mapUrl = settings?.store_google_map_embed || '';

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => onNavigate?.('home')}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600 transition hover:text-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Storefront</span>
      </button>

      <div className="space-y-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-10">
        <div className="space-y-2 border-b border-slate-100 pb-5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {page?.title ||
              (isContact ? 'Contact Us & Store Location' : 'Information')}
          </h1>

          {page?.description && (
            <p className="text-sm font-medium text-slate-500">
              {page.description}
            </p>
          )}
        </div>

        {isContact && (
          <div className="animate-fade-in space-y-8">
            {/* Store contact information */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <MapPin className="h-4 w-4" />
                </div>

                <h3 className="text-xs font-bold text-slate-900">
                  Physical Store Address
                </h3>

                <p className="break-words text-xs leading-relaxed text-slate-600">
                  {storeAddress || 'Store address is not configured.'}
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800">
                  <Phone className="h-4 w-4" />
                </div>

                <h3 className="text-xs font-bold text-slate-900">
                  Phone Support
                </h3>

                {storeMobile ? (
                  <a
                    href={`tel:${storeMobile.replace(/[^\d+]/g, '')}`}
                    className="break-words text-xs font-semibold text-slate-700 hover:text-indigo-700"
                  >
                    {storeMobile}
                  </a>
                ) : (
                  <p className="text-xs text-slate-500">
                    Phone number not configured.
                  </p>
                )}

                <span className="block text-[10px] text-slate-400">
                  Customer Care Hotline
                </span>
              </div>

              <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>

                <h3 className="text-xs font-bold text-emerald-950">
                  WhatsApp Support
                </h3>

                <p className="break-words text-xs font-mono font-bold text-emerald-800">
                  {whatsappDisplay || 'WhatsApp not configured'}
                </p>

                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Chat on WhatsApp →
                  </a>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Clock3 className="h-4 w-4" />
                </div>

                <h3 className="text-xs font-bold text-slate-900">
                  Operating Hours
                </h3>

                <p className="text-xs text-slate-600">
                  {businessHours || 'Business hours not configured.'}
                </p>

                <span className="block text-[10px] font-semibold text-emerald-700">
                  Store Opening Hours
                </span>
              </div>
            </div>

            {/* Email and GST */}
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                  <Mail className="h-4 w-4" />
                </div>

                <div>
                  <span className="block font-bold text-slate-900">
                    Official Support Email
                  </span>

                  {storeEmail ? (
                    <a
                      href={`mailto:${storeEmail}`}
                      className="break-all text-slate-600 hover:text-emerald-700"
                    >
                      {storeEmail}
                    </a>
                  ) : (
                    <span className="text-slate-500">
                      Email not configured.
                    </span>
                  )}
                </div>
              </div>

              {storeGst && (
                <div className="break-words text-[11px] text-slate-500 sm:text-right">
                  GST: <strong>{storeGst}</strong>
                </div>
              )}
            </div>

            {/* Contact form */}
            <div
              id="contact-form"
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
            >
              <div className="mb-6">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Send className="h-5 w-5" />
                </div>

                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
                  Send Us Your Query
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Have a question about {storeName}? Fill in the details
                  below and submit your query.
                </p>
              </div>

              <form
                onSubmit={handleContactSubmit}
                noValidate
                className="space-y-5"
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Full Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    maxLength={100}
                    required
                    aria-invalid={Boolean(contactErrors.name)}
                    aria-describedby={
                      contactErrors.name ? 'contact-name-error' : undefined
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                      contactErrors.name
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100'
                    }`}
                  />

                  {contactErrors.name && (
                    <p
                      id="contact-name-error"
                      className="mt-1.5 text-xs text-red-600"
                    >
                      {contactErrors.name}
                    </p>
                  )}
                </div>

                {/* Contact number */}
                <div>
                  <label
                    htmlFor="contact-number"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Contact Number <span className="text-red-500">*</span>
                  </label>

                  <div
                    className={`flex overflow-hidden rounded-xl border focus-within:ring-2 ${
                      contactErrors.contact_number
                        ? 'border-red-400 focus-within:ring-red-100'
                        : 'border-slate-300 focus-within:border-emerald-600 focus-within:ring-emerald-100'
                    }`}
                  >
                    <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                      +91
                    </span>

                    <input
                      id="contact-number"
                      type="tel"
                      name="contact_number"
                      value={contactForm.contact_number}
                      onChange={handleContactChange}
                      placeholder="10-digit mobile number"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      aria-invalid={Boolean(contactErrors.contact_number)}
                      aria-describedby={
                        contactErrors.contact_number
                          ? 'contact-number-error'
                          : undefined
                      }
                      className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  {contactErrors.contact_number && (
                    <p
                      id="contact-number-error"
                      className="mt-1.5 text-xs text-red-600"
                    >
                      {contactErrors.contact_number}
                    </p>
                  )}
                </div>

                {/* Query */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label
                      htmlFor="contact-query"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Your Query <span className="text-red-500">*</span>
                    </label>

                    <span className="text-xs text-slate-400">
                      {contactForm.query.length}/2000
                    </span>
                  </div>

                  <textarea
                    id="contact-query"
                    name="query"
                    value={contactForm.query}
                    onChange={handleContactChange}
                    placeholder="Describe your question or how we can help..."
                    rows={5}
                    maxLength={2000}
                    required
                    aria-invalid={Boolean(contactErrors.query)}
                    aria-describedby={
                      contactErrors.query ? 'contact-query-error' : undefined
                    }
                    className={`w-full resize-y rounded-xl border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                      contactErrors.query
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-100'
                    }`}
                  />

                  {contactErrors.query ? (
                    <p
                      id="contact-query-error"
                      className="mt-1.5 text-xs text-red-600"
                    >
                      {contactErrors.query}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Please enter at least 10 characters.
                    </p>
                  )}
                </div>

                {/* API response message */}
                {contactMessage.text && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`flex items-start gap-2 rounded-xl p-4 text-sm ${
                      contactMessage.type === 'success'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {contactMessage.type === 'success' ? (
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    )}

                    <p>{contactMessage.text}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {contactSubmitting ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Query
                    </>
                  )}
                </button>

                <p className="text-xs leading-relaxed text-slate-400">
                  Fields marked with * are required. Please provide a valid
                  contact number so our team can respond to your query.
                </p>
              </form>
            </div>

            {/* Google Maps */}
            {mapUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-600" />

                  <h2 className="text-sm font-bold text-slate-900">
                    Find {storeName}
                  </h2>
                </div>

                <div className="h-80 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner sm:h-96">
                  <iframe
                    title={`${storeName} location`}
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regular CMS content pages */}
        {!isContact && (
          <div className="space-y-4">
            {page?.content ? (
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {page.content}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {pageError || 'No content is available for this page.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
