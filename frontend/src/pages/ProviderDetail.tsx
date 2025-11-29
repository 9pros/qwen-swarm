import React from 'react';

const ProviderDetail: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Provider Details
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View detailed provider information and configuration
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Provider detail view coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderDetail;