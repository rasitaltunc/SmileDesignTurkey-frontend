import { useState, useEffect } from 'react';
import { Upload, File, Trash2, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getPatientPortalData,
  getPatientFiles,
  uploadPatientFile,
  deletePatientFile,
  getPatientFileUrl,
  type PatientPortalData,
  type PatientFile,
} from '@/lib/patientPortal';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function PatientPortal() {
  const { user, role, logout } = useAuthStore();
  const [portalData, setPortalData] = useState<PatientPortalData | null>(null);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Redirect if not patient
  useEffect(() => {
    if (role && role !== 'patient') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [role]);

  // Load portal data and files
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [portal, fileList] = await Promise.all([
          getPatientPortalData(),
          getPatientFiles(),
        ]);
        setPortalData(portal);
        setFiles(fileList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portal data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate file sizes (50MB max)
    const maxSize = 50 * 1024 * 1024;
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > maxSize) {
        setToast({ message: `File ${file.name} is too large (max 50MB)`, type: 'error' });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add to upload queue
    const newUploads: UploadProgress[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
    }));
    setUploadQueue((prev) => [...prev, ...newUploads]);

    // Upload each file
    for (const upload of newUploads) {
      try {
        // Simulate progress (Supabase doesn't provide progress callbacks)
        const progressInterval = setInterval(() => {
          setUploadQueue((prev) =>
            prev.map((u) => {
              if (u.file === upload.file && u.progress < 90) {
                return { ...u, progress: u.progress + 10 };
              }
              return u;
            })
          );
        }, 200);

        await uploadPatientFile(upload.file);
        clearInterval(progressInterval);
        
        setUploadQueue((prev) =>
          prev.map((u) => (u.file === upload.file ? { ...u, status: 'success' as const, progress: 100 } : u))
        );
        
        // Reload files list
        setIsLoadingFiles(true);
        const fileList = await getPatientFiles();
        setFiles(fileList);
        setIsLoadingFiles(false);
        
        setToast({ message: `${upload.file.name} uploaded successfully`, type: 'success' });
        
        // Remove from queue after 2 seconds
        setTimeout(() => {
          setUploadQueue((prev) => prev.filter((u) => u.file !== upload.file));
        }, 2000);
      } catch (err) {
        setUploadQueue((prev) =>
          prev.map((u) => (u.file === upload.file ? { ...u, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' } : u))
        );
        setToast({ message: `Failed to upload ${upload.file.name}`, type: 'error' });
      }
    }

    // Reset file input
    e.target.value = '';
  };

  const handleDeleteFile = async (filePath: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      await deletePatientFile(filePath);
      setFiles(files.filter((f) => f.name !== fileName));
      setToast({ message: `${fileName} deleted successfully`, type: 'success' });
    } catch (err) {
      setToast({ message: `Failed to delete ${fileName}`, type: 'error' });
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const url = await getPatientFileUrl(filePath);
      window.open(url, '_blank');
    } catch (err) {
      setToast({ message: `Failed to open ${fileName}`, type: 'error' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Plan</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Patient Profile & Lead Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Information</h2>
          
          {portalData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900 mt-1">{portalData.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900 mt-1">{portalData.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 mt-1">{portalData.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Treatment Interest</label>
                <p className="text-gray-900 mt-1">{portalData.treatment_type || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Plan Created</label>
                <p className="text-gray-900 mt-1">{formatDate(portalData.lead_created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-gray-900 mt-1">{portalData.lead_status || 'New'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Your plan is not yet linked to your account.</p>
              <p className="text-sm text-gray-500 mt-2">
                Please contact support to link your plan.
              </p>
            </div>
          )}
        </div>

        {/* Document Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Documents</h2>

          {/* Upload Area */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Upload Files (Photos, PDFs, Documents)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,application/pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max file size: 50MB. Supported: Images, PDF, Word documents
                </p>
              </label>
            </div>

            {/* Upload Progress */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadQueue.map((upload, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 truncate flex-1">
                        {upload.file.name}
                      </span>
                      {upload.status === 'uploading' && (
                        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      )}
                      {upload.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    {upload.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                    {upload.error && (
                      <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Files List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                Uploaded Files ({files.length})
              </h3>
              <button
                onClick={async () => {
                  setIsLoadingFiles(true);
                  try {
                    const fileList = await getPatientFiles();
                    setFiles(fileList);
                  } catch (err) {
                    setToast({ message: 'Failed to refresh files', type: 'error' });
                  } finally {
                    setIsLoadingFiles(false);
                  }
                }}
                disabled={isLoadingFiles}
                className="text-sm text-teal-600 hover:text-teal-700 disabled:opacity-50"
              >
                {isLoadingFiles ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No files uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => {
                  const filePath = `patient/${user?.id}/${file.name}`;
                  const fileSize = file.metadata?.size || 0;
                  return (
                    <div
                      key={file.id || file.name}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(fileSize)} • {formatDate(file.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadFile(filePath, file.name)}
                          className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Open/Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(filePath, file.name)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

