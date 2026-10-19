'use client'
import React, { useState } from 'react';
import PageHeader from '../../../components/PageHeader';
import AdHocSendTab from '@/components/AdHocSendTab';
import Link from 'next/link';


export default function EmailCenterPage() {
    const [activeTab, setActiveTab] = useState('adhoc');

    const tabs = [
        { id: 'adhoc', name: 'Manual/Transactional Send' },
        // { id: 'logs', name: 'Delivery Logs & History' }, // Added for completeness in UI vision
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'adhoc':
                return <AdHocSendTab />;
            case 'logs':
                return (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center text-gray-500">
                        <p className="text-xl font-semibold mb-2">Delivery Logs Coming Soon</p>
                        <p>This section will track all sent emails (sent, delivered, failed) via webhooks from your SMTP provider.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <main className="container mx-auto">
            <div className="space-y-6">
                {/* 1. Page Header */}
                <PageHeader 
                    HeaderText="Email Center" 
                    SubHeaderText="Send one-off emails to a single person, like a delisting notice." 
                />

                {/* 2. Tab Navigation - Cleaner Tabs */}
                <div className="bg-white rounded-xl  border border-slate-200 p-2">
                    <nav className="flex space-x-2 md:space-x-4" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    py-2 px-3 md:px-5 font-semibold text-sm rounded-lg transition-all duration-200 ease-in-out
                                    ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                                    }
                                `}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                    To email or WhatsApp a group of users (a segment, a school, or people you pick), use{" "}
                    <Link href="/campaigns" className="font-medium text-indigo-700 underline">Campaigns</Link>.
                </p>

                {/* 3. Tab Content */}
                <div className="pt-2">
                    {renderContent()}
                </div>
            </div>
        </main>
    );
}