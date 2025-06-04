import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  constructor() {
    this.uploadTasks = new Map();
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    this.allowedDocumentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];
    this.allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.maxImageSize = 50 * 1024 * 1024; // 50MB
  }

  // Validate file before upload
  validateFile(file, type = 'any') {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
    }

    // Check file type based on category
    if (type === 'image') {
      if (file.size > this.maxImageSize) {
        throw new Error(`Image size exceeds ${this.maxImageSize / 1024 / 1024}MB limit`);
      }
      if (!this.allowedImageTypes.includes(file.type)) {
        throw new Error('Invalid image type. Allowed types: JPEG, PNG, GIF, WebP, SVG');
      }
    } else if (type === 'document') {
      if (!this.allowedDocumentTypes.includes(file.type)) {
        throw new Error('Invalid document type. Allowed types: PDF, Word, Excel, PowerPoint, Text, CSV');
      }
    } else if (type === 'video') {
      if (!this.allowedVideoTypes.includes(file.type)) {
        throw new Error('Invalid video type. Allowed types: MP4, QuickTime, WebM');
      }
    }

    // Security: Check filename
    const filename = file.name;
    const invalidChars = /[<>:"|?*\x00-\x1f]/g;
    if (invalidChars.test(filename)) {
      throw new Error('Filename contains invalid characters');
    }

    return true;
  }

  // Determine file type category
  getFileCategory(file) {
    if (this.allowedImageTypes.includes(file.type)) return 'images';
    if (this.allowedDocumentTypes.includes(file.type)) return 'documents';
    if (this.allowedVideoTypes.includes(file.type)) return 'files';
    return 'files';
  }

  // Generate unique filename
  generateUniqueFilename(originalFilename) {
    const extension = originalFilename.split('.').pop();
    const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `${sanitizedName}_${uuidv4()}.${extension}`;
  }

  // Upload file to Firebase Storage
  async uploadFile(file, workspaceId, channelId, userId, onProgress) {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename and determine folder
      const uniqueFilename = this.generateUniqueFilename(file.name);
      const category = this.getFileCategory(file);
      const storagePath = `workspaces/${workspaceId}/channels/${channelId}/${category}/${uniqueFilename}`;

      // Create storage reference
      const storageRef = ref(storage, storagePath);

      // Create metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          workspaceId,
          channelId
        }
      };

      // Start upload
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      // Store upload task for cancellation
      const taskId = uuidv4();
      this.uploadTasks.set(taskId, uploadTask);

      // Return promise with progress tracking
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Progress callback
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const speed = snapshot.bytesTransferred / ((Date.now() - snapshot.metadata.timeCreated) / 1000);
            const remainingBytes = snapshot.totalBytes - snapshot.bytesTransferred;
            const remainingTime = remainingBytes / speed;

            if (onProgress) {
              onProgress({
                progress: Math.round(progress),
                bytesTransferred: snapshot.bytesTransferred,
                totalBytes: snapshot.totalBytes,
                speed: Math.round(speed / 1024), // KB/s
                remainingTime: Math.round(remainingTime), // seconds
                state: snapshot.state
              });
            }
          },
          (error) => {
            // Error callback
            this.uploadTasks.delete(taskId);
            reject(error);
          },
          async () => {
            // Success callback
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const fileMetadata = await getMetadata(uploadTask.snapshot.ref);
              
              this.uploadTasks.delete(taskId);
              
              resolve({
                id: taskId,
                url: downloadURL,
                path: storagePath,
                name: file.name,
                size: file.size,
                type: file.type,
                category,
                metadata: fileMetadata,
                uploadedAt: new Date()
              });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Cancel upload
  cancelUpload(taskId) {
    const uploadTask = this.uploadTasks.get(taskId);
    if (uploadTask) {
      uploadTask.cancel();
      this.uploadTasks.delete(taskId);
      return true;
    }
    return false;
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      const metadata = await getMetadata(fileRef);
      return metadata;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  // Update file metadata
  async updateFileMetadata(filePath, newMetadata) {
    try {
      const fileRef = ref(storage, filePath);
      const updated = await updateMetadata(fileRef, newMetadata);
      return updated;
    } catch (error) {
      console.error('Error updating file metadata:', error);
      throw error;
    }
  }

  // Generate thumbnail URL (for images)
  getThumbnailUrl(originalUrl, size = '150x150') {
    // This will be handled by Cloud Functions when available
    // Without functions (free tier), we return the original URL
    // The browser will handle resizing via CSS
    return originalUrl;
  }

  // Check if file is an image
  isImage(file) {
    return this.allowedImageTypes.includes(file.type);
  }

  // Check if file is a document
  isDocument(file) {
    return this.allowedDocumentTypes.includes(file.type);
  }

  // Check if file is a video
  isVideo(file) {
    return this.allowedVideoTypes.includes(file.type);
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on type
  getFileIcon(fileType) {
    if (this.allowedImageTypes.includes(fileType)) return 'fa-image';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('sheet')) return 'fa-file-excel';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
    if (fileType.includes('video')) return 'fa-file-video';
    if (fileType.includes('text')) return 'fa-file-alt';
    return 'fa-file';
  }
}

export const storageService = new StorageService();