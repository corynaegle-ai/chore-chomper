import { useState, useRef } from 'react';
import { Camera, X, Upload, Image, Loader2 } from 'lucide-react';
import { uploadApi } from '../api/client';

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved?: () => void;
  currentPhotoUrl?: string | null;
  disabled?: boolean;
}

export default function PhotoUpload({
  onPhotoUploaded,
  onPhotoRemoved,
  currentPhotoUrl,
  disabled = false,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setError(null);
    setUploading(true);

    // Create preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const result = await uploadApi.uploadPhoto(file);
      // Clean up local preview and use server URL
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(result.url);
      onPhotoUploaded(result.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    if (onPhotoRemoved) {
      onPhotoRemoved();
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Preview or upload buttons */}
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Uploaded photo"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          {!uploading && !disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCamera}
            disabled={disabled || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-chomper-100 text-chomper-700 rounded-lg hover:bg-chomper-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5" />
            <span className="font-medium">Take Photo</span>
          </button>
          <button
            type="button"
            onClick={openFileSelector}
            disabled={disabled || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Image className="w-5 h-5" />
            <span className="font-medium">Gallery</span>
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Upload status */}
      {uploading && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading photo...
        </p>
      )}
    </div>
  );
}
