import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { DocumentService } from "@/lib/documentService";

const documentTypes = [
  { value: "releve_notes", label: "Relevé de notes étudiant" },
  { value: "lettre_honoraires", label: "Lettre d'honoraires enseignant" },
  { value: "pv_conseil", label: "PV Conseil facultaire" },
  { value: "correspondance", label: "Correspondance administrative" },
  { value: "rapport", label: "Rapport" },
  { value: "demande", label: "Demande administrative" }
];

const allowedFileTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

interface DocumentUploadProps {
  onUploadSuccess?: (document: any) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    document_type: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!allowedFileTypes.includes(file.type)) {
      alert("Type de fichier non supporté. Utilisez PDF, Word ou Excel.");
      return;
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier est trop volumineux. Taille maximum: 10MB");
      return;
    }

    setSelectedFile(file);
    
    // Auto-remplir le titre si vide
    if (!formData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, title: fileName }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.title || !formData.document_type) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const document = await DocumentService.uploadDocument(selectedFile, {
        title: formData.title,
        description: formData.description,
        document_type: formData.document_type
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (document) {
        setTimeout(() => {
          setIsOpen(false);
          setSelectedFile(null);
          setFormData({ title: "", description: "", document_type: "" });
          setUploadProgress(0);
          onUploadSuccess?.(document);
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ulpgl" className="gap-2">
          <Upload className="h-4 w-4" />
          Uploader un document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploader un nouveau document
          </DialogTitle>
          <DialogDescription>
            Ajoutez un document Word, PDF ou Excel au système
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Zone de drop */}
          <Card className="border-dashed border-2 border-muted-foreground/25 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      <span className="text-2xl">{getFileIcon(selectedFile)}</span>
                      {selectedFile.name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Changer de fichier
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Glissez votre fichier ici ou cliquez pour sélectionner</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, Excel - Maximum 10MB
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Sélectionner un fichier
                    </Button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre du document *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nom du document..."
                required
              />
            </div>

            <div>
              <Label htmlFor="document_type">Type de document *</Label>
              <Select 
                value={formData.document_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, document_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du document..."
                rows={3}
              />
            </div>
          </div>

          {/* Progression */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Avertissement */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Une fois uploadé, le document sera accessible selon les permissions de votre rôle. 
              Les documents sensibles nécessitent une validation avant publication.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !formData.title || !formData.document_type || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Upload en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Uploader le document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}