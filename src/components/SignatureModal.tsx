import { useState } from "react";
import { SignatureWorkflowService } from "@/lib/signatureWorkflow";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PenTool, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface SignatureModalProps {
  document: any;
  isOpen: boolean;
  onClose: () => void;
  onSign: (documentId: string, comments?: string) => void;
}

export function SignatureModal({ document, isOpen, onClose, onSign }: SignatureModalProps) {
  const [comments, setComments] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSign = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');
      
      const success = await SignatureWorkflowService.signDocument(
        document.id,
        user.id,
        comments
      );
      
      if (success) {
        onSign(document.id, comments);
        onClose();
        setComments("");
      }
    } catch (error) {
      console.error('Erreur signature:', error);
      toast({
        title: "Erreur lors de la signature",
        description: error.message || "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');
      
      const success = await SignatureWorkflowService.rejectDocument(
        document.id,
        user.id,
        comments || "Aucune raison spécifiée"
      );
      
      if (success) {
        onClose();
        setComments("");
      }
    } catch (error) {
      console.error('Erreur rejet:', error);
      toast({
        title: "Erreur lors du rejet",
        description: error.message || "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature du document
          </DialogTitle>
          <DialogDescription>
            Signez ou rejetez le document "{document.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations du document */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Document:</strong> {document.title}<br />
              <strong>Type:</strong> {document.type}<br />
              <strong>Créé par:</strong> {document.createdBy}<br />
              <strong>Date:</strong> {document.createdAt}
            </AlertDescription>
          </Alert>

          {/* Zone de commentaires */}
          <div className="space-y-2">
            <Label htmlFor="comments">Commentaires (optionnel)</Label>
            <Textarea
              id="comments"
              placeholder="Ajoutez vos commentaires sur ce document..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>

          {/* Avertissement */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              En signant ce document, vous confirmez avoir vérifié son contenu et l'approuver. 
              Cette action est irréversible.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isLoading}
            >
              Rejeter le document
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Annuler
              </Button>
              <Button 
                variant="ulpgl" 
                onClick={handleSign}
                disabled={isLoading}
                className="gap-2"
              >
                <PenTool className="h-4 w-4" />
                {isLoading ? "Signature en cours..." : "Signer le document"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}