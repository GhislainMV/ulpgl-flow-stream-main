import { useState } from "react";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/LanguageProvider";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentService, DocumentFile } from "@/lib/documentService";
import { TemplateService, DocumentTemplate, PlaceholderData } from "@/lib/templateService";
import { SignatureWorkflowService } from "@/lib/signatureWorkflow";
import { FileText, Users, Download, Send, PenTool, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const documentTypes = [
  {
    id: "releve_notes",
    title: "Relevé de notes étudiant",
    description: "Document officiel des notes d'un étudiant",
    template: "Template_Releve_Notes.docx",
    workflow: ["SAF/Appariteur", "Libraire", "Comptable", "Bibliothécaire", "Doyen"],
    restrictedRoles: ["caissiere", "sgad", "sgac", "ab", "dircab", "recteur"]
  },
  {
    id: "lettre_honoraires",
    title: "Lettre d'honoraires enseignant",
    description: "Fiche de suivi des enseignements et honoraires",
    template: "Fiche_Suivi_Enseignements.pdf",
    workflow: ["SAF", "Doyen", "SGAD", "SGAC", "AB", "Recteur", "Caissière (lecture)"],
    restrictedRoles: []
  },
  {
    id: "pv_conseil",
    title: "PV Conseil facultaire",
    description: "Procès-verbal des réunions du conseil",
    template: "PV_Conseil_Template.docx",
    workflow: ["SAF", "Doyen", "SGAC", "Recteur"],
    restrictedRoles: []
  },
  {
    id: "correspondance",
    title: "Correspondance simple",
    description: "Document de correspondance administrative",
    template: "Correspondance_Template.docx",
    workflow: ["Créateur", "Destinataire(s)"],
    restrictedRoles: []
  }
];

const allRoles = [
  { value: "sgac", label: "SGAC" },
  { value: "sgad", label: "SGAD" },
  { value: "doyen", label: "Doyen" },
  { value: "recteur", label: "Recteur" },
  { value: "ab", label: "AB" },
  { value: "dircab", label: "Directeur Cabinet" },
  { value: "comptable", label: "Comptable" },
  { value: "appariteur", label: "Appariteur" }
];

export default function CreateDocument() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("");
  const [availableTemplates, setAvailableTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [useTemplate, setUseTemplate] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    recipients: [] as string[],
    studentName: "",
    studentId: "",
    teacherName: "",
    subject: "",
    hours: "",
    academicYear: "2024-2025"
  });

  useEffect(() => {
    loadAvailableTemplates();
  }, []);

  useEffect(() => {
    if (selectedType) {
      checkTemplateAvailability();
    }
  }, [selectedType]);

  const loadAvailableTemplates = async () => {
    const templates = await TemplateService.getAvailableTemplates();
    setAvailableTemplates(templates);
  };

  const checkTemplateAvailability = async () => {
    const template = await TemplateService.getTemplateByType(selectedType);
    setSelectedTemplate(template);
    setUseTemplate(!!template);
  };

  const selectedDocumentType = documentTypes.find(doc => doc.id === selectedType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un type de document.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un titre pour le document.",
        variant: "destructive",
      });
      return;
    }
    
    createDocument(false);
  };

  const handleSendDocument = async () => {
    if (!selectedType || !formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez compléter les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }
    
    await createDocument(true);
  };

  const createDocument = async (sendForSignature: boolean) => {
    try {
      let filePath: string | null = null;

      if (useTemplate && selectedTemplate) {
        // Utiliser un template
        const placeholderData: PlaceholderData = {
          '{{date}}': new Date().toLocaleDateString('fr-FR'),
          '{{annee_academique}}': formData.academicYear,
          '{{nom_etudiant}}': formData.studentName,
          '{{numero_etudiant}}': formData.studentId,
          '{{nom_enseignant}}': formData.teacherName,
          '{{matiere}}': formData.subject,
          '{{heures}}': formData.hours,
          '{{titre}}': formData.title,
          '{{contenu}}': formData.description
        };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilisateur non authentifié');

        filePath = await TemplateService.generateDocumentFromTemplate(
          selectedTemplate.id,
          placeholderData,
          formData.title,
          user.id
        );
      }

      // Créer l'entrée en base de données
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          title: formData.title,
          description: formData.description,
          document_type: selectedType,
          file_path: filePath,
          status: sendForSignature ? 'pending_signature' : 'draft',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Si envoi pour signature, initialiser le workflow
      if (sendForSignature && document) {
        await SignatureWorkflowService.initializeWorkflow(document.id, selectedType);
      }

      toast({
        title: sendForSignature ? "Document envoyé pour signature" : "Document créé avec succès",
        description: `Le document "${formData.title}" a été ${sendForSignature ? 'envoyé dans le workflow de signature' : 'sauvegardé en brouillon'}.`,
      });

      setTimeout(() => {
        navigate("/documents");
      }, 1500);

    } catch (error) {
      console.error('Erreur création document:', error);
      toast({
        title: "Erreur de création",
        description: "Impossible de créer le document.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDraft = () => {
    createDocument(false);
  };

  const handleAddSignature = () => {
    toast({
      title: "Fonctionnalité en développement",
      description: "La signature numérique sera bientôt disponible.",
    });
  };

  const renderSpecificFields = () => {
    switch (selectedType) {
      case "releve_notes":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="studentName">Nom de l'étudiant</Label>
                <Input
                  id="studentName"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Jean KABILA"
                />
              </div>
              <div>
                <Label htmlFor="studentId">Numéro étudiant</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="UL2024001"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="academicYear">Année académique</Label>
              <Select value={formData.academicYear} onValueChange={(value) => setFormData({ ...formData, academicYear: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2023-2024">2023-2024</SelectItem>
                  <SelectItem value="2022-2023">2022-2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case "lettre_honoraires":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teacherName">Nom de l'enseignant</Label>
                <Input
                  id="teacherName"
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  placeholder="Dr. MUKENDI"
                />
              </div>
              <div>
                <Label htmlFor="subject">Matière enseignée</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Informatique Appliquée"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="hours">Nombre d'heures</Label>
              <Input
                id="hours"
                type="number"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="60"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const handleUploadSuccess = (document: any) => {
    toast({
      title: "Document uploadé avec succès",
      description: `Le document "${document.title}" a été ajouté au système.`,
    });
    
    setTimeout(() => {
      navigate("/documents");
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("createDocument")}</h1>
          <p className="text-muted-foreground">
            Créez un nouveau document administratif avec signature numérique
          </p>
        </div>
        <div className="flex gap-2">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Type Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Type de document
            </CardTitle>
            <CardDescription>
              Sélectionnez le modèle approprié
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documentTypes.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedType === doc.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedType(doc.id)}
              >
                <h4 className="font-medium text-sm mb-1">{doc.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{doc.description}</p>
                {availableTemplates.some(t => t.document_type === doc.id) && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                    <FileText className="h-3 w-3" />
                    Template disponible
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {doc.workflow.length} étapes de signature
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Document Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Détails du document</CardTitle>
            <CardDescription>
              {selectedDocumentType ? 
                (selectedTemplate ? `Template: ${selectedTemplate.name}` : `Type: ${selectedDocumentType.title}`) 
                : "Sélectionnez un type de document"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDocumentType ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sélectionnez un type de document pour commencer</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                {selectedTemplate && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Template détecté:</strong> {selectedTemplate.name}<br />
                      <strong>Placeholders disponibles:</strong> {selectedTemplate.placeholders.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">{t("documentTitle")}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={`${selectedDocumentType.title} - ${new Date().toLocaleDateString()}`}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description du document..."
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                {/* Template-specific fields */}
                {renderSpecificFields()}

                <Separator />

                {/* Workflow Preview */}
                <div className="space-y-3">
                  <Label>Workflow de signature</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDocumentType.workflow.map((step, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {index + 1}. {step}
                      </Badge>
                    ))}
                  </div>
                  {selectedDocumentType.restrictedRoles.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Accès restreint pour: {selectedDocumentType.restrictedRoles.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-3">
                  <Button type="button" onClick={handleSendDocument} variant="ulpgl" className="gap-2">
                    <Send className="h-4 w-4" />
                    Créer et envoyer
                  </Button>
                  <Button type="button" onClick={handleSaveDraft} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Enregistrer brouillon
                  </Button>
                  <Button type="button" onClick={handleAddSignature} variant="outline" className="gap-2">
                    <PenTool className="h-4 w-4" />
                    Ajouter signature
                  </Button>
                  <Button type="submit" variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}