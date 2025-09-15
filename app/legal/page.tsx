"use client";

import Link from 'next/link';
import { SITE } from '@/lib/site';

export default function LegalPage() {
  const email = SITE.supportEmail;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/home" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Home</Link>
          <h1 className="text-2xl font-semibold">Legal & Policies</h1>
          <div />
        </div>

        <div className="rounded-xl border bg-white p-5 space-y-6">
          <section>
            <h2 className="text-lg font-semibold">Business Information</h2>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Business name:</span> {SITE.name}
            </p>
            <p className="mt-1 text-sm text-gray-700">
              <span className="font-medium">What we do:</span> {SITE.description}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Customer Service Contact</h2>
            <p className="mt-2 text-sm text-gray-700">
              For any questions about your account, billing, or product support, contact us at
              {" "}
              <a href={`mailto:${email}`} className="underline">{email}</a>
              {SITE.address ? (
                <>
                  {" "}or by mail at <span className="whitespace-pre-wrap">{SITE.address}</span>.
                </>
              ) : null}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Refund & Dispute Policy</h2>
            <p className="mt-2 text-sm text-gray-700">
              {SITE.name} is a software service for creating inspection reports. Subscriptions can
              be cancelled at any time (see Cancellation Policy below). If you believe a charge
              was made in error or you experience a product issue we are unable to resolve,
              please email us within 7 days of the charge. We will review refund requests on a
              case‑by‑case basis and may issue a full or partial refund at our discretion.
            </p>
            <p className="mt-2 text-sm text-gray-700">
              If you open a card dispute, please also email us so we can help resolve it quickly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Cancellation Policy</h2>
            <p className="mt-2 text-sm text-gray-700">
              You can cancel your subscription at any time from the Account page. When you cancel,
              your plan remains active until the end of the current billing period. You will not be
              charged again unless you re‑activate your subscription.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Return Policy</h2>
            <p className="mt-2 text-sm text-gray-700">
              We do not ship physical goods. Because our product is a digital service, physical
              returns are not applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Legal or Export Restrictions</h2>
            <p className="mt-2 text-sm text-gray-700">
              You are responsible for complying with all applicable laws while using the service.
              Use in jurisdictions where the service is prohibited is not allowed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Terms for Promotions</h2>
            <p className="mt-2 text-sm text-gray-700">
              From time to time we may offer promotional discounts or trials. Unless otherwise
              stated, promotions are available to new subscribers only, cannot be combined, and are
              limited to one per account. At the end of a promotional period, the subscription
              renews at the standard price unless you cancel before the renewal date.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

