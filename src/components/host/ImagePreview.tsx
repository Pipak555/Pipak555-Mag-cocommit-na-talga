import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ImagePreviewProps {
  images: File[];
  onRemove: (index: number) => void;
  uploadProgress?: number;
  isUploading?: boolean;
}

export const ImagePreview = ({
  images,
  onRemove,
  uploadProgress = 0,
  isUploading = false,
}: ImagePreviewProps) => {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg border-muted-foreground/25">
        <div className="text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No images selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((file, index) => {
          const previewUrl = URL.createObjectURL(file);
          return (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={previewUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {!isUploading && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div className="mt-1 text-xs text-muted-foreground truncate">
                {file.name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          );
        })}
      </div>
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uploading images...</span>
            <span className="text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );
};

