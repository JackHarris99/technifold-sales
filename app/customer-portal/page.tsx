'use client';

import { useState } from 'react';
import { Mail, Phone, Shield } from 'lucide-react';
import Link from 'next/link';

export default function CustomerPortalLandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    // This would send a request to your team to generate a portal link
    console.log('Requesting access for:', email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Technifold Customer Portal</h1>
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              Back to Main Site
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Welcome to Your Customer Portal
            </h2>
            <p className="text-xl text-blue-100">
              Access your personalized dashboard to reorder consumables and manage your tools
            </p>
          </div>

          {/* Access Methods */}
          <div className="p-8 md:p-12">
            {!submitted ? (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    How to Access Your Portal
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Mail className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-semibold text-gray-900">Via Email Link</p>
                        <p className="text-gray-600">
                          Check your email for your personalized portal link. We send these regularly to help you reorder consumables.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Shield className="text-blue-600 mr-3 mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-semibold text-gray-900">Secure Access</p>
                        <p className="text-gray-600">
                          Each customer receives a unique, secure link that shows only their tools and consumables.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Access Form */}
                <div className="border-t pt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Don&apos;t Have a Link?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    If you're a Technifold customer and haven&apos;t received your portal link, request access below:
                  </p>
                  
                  <form onSubmit={handleRequestAccess} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Your Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your.email@company.com"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Request Portal Access
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Request Received!
                </h3>
                <p className="text-gray-600 mb-6">
                  We&apos;ll send your personalized portal link to <strong>{email}</strong> shortly.
                </p>
                <p className="text-sm text-gray-500">
                  Please check your inbox (and spam folder) within the next few hours.
                </p>
              </div>
            )}

            {/* Contact Support */}
            <div className="mt-8 pt-8 border-t">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Need Immediate Assistance?
                </h4>
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                  <a
                    href="tel:+441234567890"
                    className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="mr-2" size={16} />
                    +44 (0) 1234 567890
                  </a>
                  <a
                    href="mailto:sales@technifold.com"
                    className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="mr-2" size={16} />
                    sales@technifold.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h5 className="font-semibold text-gray-900 mb-2">Save Time</h5>
            <p className="text-sm text-gray-600">
              Quickly reorder your regular consumables without searching
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h5 className="font-semibold text-gray-900 mb-2">Perfect Fit</h5>
            <p className="text-sm text-gray-600">
              See only consumables compatible with your specific tools
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h5 className="font-semibold text-gray-900 mb-2">Fast Checkout</h5>
            <p className="text-sm text-gray-600">
              Order online or request a proforma invoice instantly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}