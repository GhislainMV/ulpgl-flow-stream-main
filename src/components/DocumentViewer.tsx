import { useState } from "react";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DocumentService, DocumentFile } from "@/lib/documentService";
import { toast } from "@/components/ui/use-toast";
import { 
  FileText, 
  Download, 
  PenTool, 
  Clock, 
  CheckCircle2, 
  User,
  Calendar,
  AlertCircle,
  ExternalLink,
  Edit
} from "lucide-react";

interface DocumentViewerProps {
  document: DocumentFile | any;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const [permissions, setPermissions] = useState({
    canView: false,
    canEdit: false,
    canSign: false,
    canDownload: false
  });
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document?.id && isOpen) {
      loadDocumentPermissions();
      loadDocumentUrl();
    }
  }, [document?.id, isOpen]);

  const loadDocumentPermissions = async () => {
    if (!document?.id) return;
    
    try {
      const perms = await DocumentService.checkDocumentPermissions(document.id);
      setPermissions(perms);
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
    }
  };

  const loadDocumentUrl = async () => {
    if (!document?.file_path) return;
    
    try {
      const url = await DocumentService.getDocumentUrl(document.file_path);
      setDocumentUrl(url);
    } catch (error) {
      console.error('Erreur génération URL:', error);
    }
  };

  if (!document) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">En cours</Badge>;
      case "signed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Signé</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Terminé</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Brouillon</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  const handleDownload = () => {
    if (!permissions.canDownload) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour télécharger ce document.",
        variant: "destructive",
      });
      return;
    }

    DocumentService.downloadDocument(document);
  };

  const handleSign = () => {
    if (!permissions.canSign) {
      toast({
        title: "Signature non autorisée",
        description: "Ce document n'est pas en attente de votre signature.",
        variant: "destructive",
      });
      return;
    }
    
    console.log(`Ouverture du modal de signature pour ${document.title}`);
  };

  const handleEdit = () => {
    if (!permissions.canEdit) {
      toast({
        title: "Modification non autorisée",
        description: "Vous n'avez pas les permissions pour modifier ce document.",
        variant: "destructive",
      });
      return;
    }

    if (documentUrl) {
      window.open(documentUrl, '_blank');
      toast({
        title: "Document ouvert",
        description: "Le document s'ouvre dans un nouvel onglet pour modification.",
      });
    }
  };

  const handleViewOnline = () => {
    if (!permissions.canView) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour voir ce document.",
        variant: "destructive",
      });
      return;
    }

    if (documentUrl) {
      window.open(documentUrl, '_blank');
    } else {
      toast({
        title: "Document non disponible",
        description: "Impossible d'ouvrir le document en ligne.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document.title}
          </DialogTitle>
          <DialogDescription>
            Détails du document et workflow de signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Informations générales</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{document.document_type || document.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut:</span>
                  {getStatusBadge(document.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le:</span>
                  <span>{new Date(document.created_at || document.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé par:</span>
                  <span>{document.createdBy || 'Utilisateur'}</span>
                </div>
                {document.file_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taille:</span>
                    <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Permissions</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {permissions.canView ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Visualisation</span>
                </div>
                <div className="flex items-center gap-2">
                  {permissions.canDownload ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Téléchargement</span>
                </div>
                <div className="flex items-center gap-2">
                  {permissions.canEdit ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Modification</span>
                </div>
                <div className="flex items-center gap-2">
                  {permissions.canSign ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Signature</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Progression</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{document.currentStep}</span>
                  <span>{document.progress}%</span>
                </div>
                <Progress value={document.progress} className="h-2" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Workflow de signature */}
          <div className="space-y-4">
            <h4 className="font-medium">Workflow de signature</h4>
            <div className="space-y-3">
              {document.workflow?.map((step: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : step.status === "pending" ? (
                      <Clock className="h-5 w-5 text-orange-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{step.step}</span>
                      <Badge variant={step.status === "completed" ? "default" : "outline"}>
                        {step.status === "completed" ? "Terminé" : 
                         step.status === "pending" ? "En cours" : "En attente"}
                      </Badge>
                    </div>
                    {step.date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        {step.date}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleViewOnline} className="gap-2" disabled={!permissions.canView}>
                <ExternalLink className="h-4 w-4" />
                Ouvrir en ligne
              </Button>
              
              <Button variant="outline" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              
              {permissions.canEdit && (
                <Button variant="outline" onClick={handleEdit} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              )}
              
              {permissions.canSign && (
                <Button variant="ulpgl" onClick={handleSign} className="gap-2">
                  <PenTool className="h-4 w-4" />
                  Signer le document
                </Button>
              )}
            </div>
            
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}