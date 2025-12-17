import { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { cn } from '../ui/utils';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

export interface DropzoneProps {
  onUpload?: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

type UploadState = 'empty' | 'uploading' | 'uploaded' | 'error';

/**
 * C/Upload/Dropzone - Design System Component
 * States: empty, uploading, uploaded, error
 */
export function Dropzone({
  onUpload,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf'],
  className
}: DropzoneProps) {
  const [state, setState] = useState<UploadState>('empty');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    if (fileArray.length > maxFiles) {
      setState('error');
      setErrorMessage(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setState('uploading');
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setState('uploaded');
          setUploadedFiles(fileArray);
          onUpload?.(fileArray);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, [maxFiles, onUpload]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const reset = () => {
    setState('empty');
    setUploadedFiles([]);
    setProgress(0);
    setErrorMessage('');
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    if (uploadedFiles.length === 1) {
      reset();
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-[var(--radius-md)] border-2 border-dashed transition-all duration-200 p-8',
          state === 'empty' && !dragActive && 'border-border-subtle bg-bg-secondary hover:border-accent-primary hover:bg-accent-soft/30',
          dragActive && 'border-accent-primary bg-accent-soft',
          state === 'uploading' && 'border-accent-primary bg-accent-soft',
          state === 'uploaded' && 'border-success bg-green-50',
          state === 'error' && 'border-error bg-red-50'
        )}
      >
        {state === 'empty' && (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-white rounded-[var(--radius-sm)] flex items-center justify-center mb-4 shadow-premium-sm">
              <Upload className="w-6 h-6 text-accent-primary" />
            </div>
            <h4 className="text-text-primary font-semibold mb-2">
              Drop files here or click to browse
            </h4>
            <p className="text-sm text-text-secondary mb-4">
              Upload up to {maxFiles} files (images or PDFs)
            </p>
            <input
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        )}

        {state === 'uploading' && (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-white rounded-[var(--radius-sm)] flex items-center justify-center mb-4 shadow-premium-sm">
              <Upload className="w-6 h-6 text-accent-primary animate-pulse" />
            </div>
            <h4 className="text-text-primary font-semibold mb-2">
              Uploading files...
            </h4>
            <div className="w-full max-w-xs mx-auto bg-white rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent-primary h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-text-secondary mt-2">{progress}%</p>
          </div>
        )}

        {state === 'uploaded' && (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-white rounded-[var(--radius-sm)] flex items-center justify-center mb-4 shadow-premium-sm">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <h4 className="text-text-primary font-semibold mb-2">
              Files uploaded successfully
            </h4>
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white px-4 py-2 rounded-[var(--radius-sm)] shadow-premium-sm"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-accent-primary" />
                    <span className="text-sm text-text-primary">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-text-tertiary hover:text-error transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              className="mt-4 text-sm text-accent-primary hover:text-accent-hover transition-colors"
            >
              Upload more files
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-white rounded-[var(--radius-sm)] flex items-center justify-center mb-4 shadow-premium-sm">
              <AlertCircle className="w-6 h-6 text-error" />
            </div>
            <h4 className="text-text-primary font-semibold mb-2">
              Upload failed
            </h4>
            <p className="text-sm text-error mb-4">{errorMessage}</p>
            <button
              onClick={reset}
              className="text-sm text-accent-primary hover:text-accent-hover transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
