import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { testPinataConnection, uploadImageToPinata } from '@/services/pinataService';
import { Loader2, CheckCircle, XCircle, Upload } from 'lucide-react';

export const TestPinata: React.FC = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    setError(null);
    addLog('Testing Pinata connection...');

    try {
      const result = await testPinataConnection();
      setConnectionResult(result);
      addLog(`Connection test: ${result ? 'SUCCESS' : 'FAILED'}`);
    } catch (err: any) {
      setError(err.message);
      setConnectionResult(false);
      addLog(`Connection error: ${err.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);
    setError(null);
    addLog(`Uploading file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    try {
      const ipfsUrl = await uploadImageToPinata(file);
      setUploadResult(ipfsUrl);
      addLog(`Upload SUCCESS: ${ipfsUrl}`);
    } catch (err: any) {
      setError(err.message);
      addLog(`Upload ERROR: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setError(null);
    setConnectionResult(null);
    setUploadResult(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Pinata IPFS Test Page</CardTitle>
          <CardDescription>
            Test Pinata connection and file upload for mobile debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Test */}
          <div className="space-y-2">
            <Button
              onClick={testConnection}
              disabled={isTestingConnection}
              className="w-full"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Pinata Connection'
              )}
            </Button>

            {connectionResult !== null && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                connectionResult ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {connectionResult ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Connection successful!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span>Connection failed!</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* File Upload Test */}
          <div className="space-y-2">
            <label className="block">
              <Button
                type="button"
                disabled={isUploading}
                className="w-full"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Test Image
                  </>
                )}
              </Button>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {uploadResult && (
              <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
                <p className="text-sm font-semibold mb-1">Upload successful!</p>
                <a
                  href={uploadResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs break-all underline"
                >
                  {uploadResult}
                </a>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
              <p className="text-sm font-semibold mb-1">Error:</p>
              <p className="text-xs">{error}</p>
            </div>
          )}

          {/* Environment Info */}
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg text-xs space-y-1">
            <p><strong>Mode:</strong> {import.meta.env.DEV ? 'Development' : 'Production'}</p>
            <p><strong>JWT Configured:</strong> {import.meta.env.VITE_PINATA_JWT ? '✅ Yes' : '❌ No'}</p>
            {import.meta.env.VITE_PINATA_JWT && (
              <p><strong>JWT Preview:</strong> {import.meta.env.VITE_PINATA_JWT.substring(0, 30)}...</p>
            )}
            <p><strong>Network:</strong> {navigator.onLine ? '✅ Online' : '❌ Offline'}</p>
            <p className="break-all"><strong>User Agent:</strong> {navigator.userAgent.substring(0, 80)}...</p>
          </div>

          {/* Instructions */}
          {!import.meta.env.VITE_PINATA_JWT && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-500 font-semibold mb-2">⚠️ Environment Variable Not Loaded!</p>
              <div className="text-xs text-yellow-400 space-y-1">
                <p><strong>If using DEV server:</strong></p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Make sure dev server is running: <code className="bg-black/30 px-1">npm run dev</code></li>
                  <li>Access via: <code className="bg-black/30 px-1">http://192.168.1.2:8080/test-pinata</code></li>
                  <li>NOT via localhost on mobile!</li>
                </ol>
                <p className="mt-2"><strong>If using BUILT app:</strong></p>
                <p>Rebuild with: <code className="bg-black/30 px-1">npm run build</code></p>
              </div>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">Debug Logs:</h3>
                <Button size="sm" variant="outline" onClick={clearLogs}>
                  Clear
                </Button>
              </div>
              <div className="p-3 bg-gray-900 rounded-lg max-h-48 overflow-y-auto">
                {logs.map((log, index) => (
                  <p key={index} className="text-xs text-gray-400 font-mono">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
