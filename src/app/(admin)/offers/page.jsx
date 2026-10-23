'use client'
import React, { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import PromotionsSection from '@/components/offers/PromotionsSection';
import GiftSection from '@/components/offers/GiftSection';
import GrantsSection from '@/components/offers/GrantsSection';
import { getOffers, getGiftOptions } from '@/utils/offersClient';

// Offers: free plans and boosts (09-offers.md). The rules live in the web
// app's lib/planGrantServer.js; this page relays through /api/offers/*.

export default function OffersPage() {
  const [data, setData] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [offers, giftOptions] = await Promise.all([getOffers(), getGiftOptions()]);
      setData(offers);
      setOptions(giftOptions);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="container mx-auto">
      <div className="space-y-6">
        <PageHeader
          HeaderText="Offers"
          SubHeaderText="Give free plans and boosts: automatic promotions for new verified students, or gifts to anyone."
        />
        {error ? (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-sm text-red-600">Couldn&apos;t load offers: {error}</div>
        ) : !data || !options ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <PromotionsSection promotions={data.promotions} plans={data.plans} schools={options.schools} onChanged={load} />
            <GiftSection plans={data.plans} options={options} onChanged={load} />
            <GrantsSection grants={data.grants} onChanged={load} />
          </>
        )}
      </div>
    </main>
  );
}
