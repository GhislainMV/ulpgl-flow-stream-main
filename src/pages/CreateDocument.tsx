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
    description: "Document officiel des notes d'un étudiant (Créé par SAF ou Appariteur uniquement)",
    template: "releve_de_notes.pdf.docx",
    workflow: ["Créateur (SAF/Appariteur)", "Libraire", "Comptable", "Bibliothécaire", "Doyen"],
    restrictedRoles: ["doyen", "sgac", "sgad", "ab", "dircab", "recteur", "caissiere", "receptionniste", "secretaire_sgac", "secretaire_sgad", "comptable", "bibliothecaire", "libraire", "cp"],
    allowedCreators: ["saf", "appariteur"]
  },
  {
    id: "lettre_honoraires",
    title: "Lettre d'honoraires enseignant",
    description: "Fiche de suivi des enseignements et honoraires (Créé par SAF uniquement)",
    template: "lettre_honoraires.pdf.docx",
    workflow: ["CP (optionnel)", "Doyen", "SGAC"],
    restrictedRoles: ["doyen", "sgac", "sgad", "ab", "dircab", "recteur", "caissiere", "receptionniste", "secretaire_sgac", "secretaire_sgad", "comptable", "bibliothecaire", "libraire", "cp", "appariteur"],
    allowedCreators: ["saf"]
  },
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
    studentName: "",
    studentId: "",
    faculte: "",
    promotion: "",
    teacherName: "",
    subject: "",
    hours: "",
    periode: "",
    montant: "",
    nomCp: "", // Optionnel pour lettre d'honoraires
    academicYear: "2024-2025"
  });
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    loadUserRole();
    loadAvailableTemplates();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
        }
      }
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
    }
  };
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

  // Vérifier si l'utilisateur peut créer ce type de document
  const canCreateSelectedType = selectedDocumentType ? 
    selectedDocumentType.allowedCreators.includes(userRole) : false;
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
      // Vérifier les permissions
      if (!canCreateSelectedType) {
        toast({
          title: "Accès refusé",
          description: `Seuls les rôles ${selectedDocumentType?.allowedCreators.join(', ')} peuvent créer ce type de document.`,
          variant: "destructive",
        });
        return;
      }

      let filePath: string | null = null;

      if (useTemplate && selectedTemplate) {
        // Utiliser un template
        const placeholderData: PlaceholderData = {
          '{{date}}': new Date().toLocaleDateString('fr-FR'),
          '{{annee_academique}}': formData.academicYear,
          '{{nom_etudiant}}': formData.studentName,
          '{{numero_etudiant}}': formData.studentId,
          '{{faculte}}': formData.faculte,
          '{{promotion}}': formData.promotion,
          '{{nom_enseignant}}': formData.teacherName,
          '{{matiere}}': formData.subject,
          '{{heures}}': formData.hours,
          '{{periode}}': formData.periode,
          '{{montant}}': formData.montant,
          '{{nom_cp}}': formData.nomCp || '', // Laisser vide si non fourni
          '{{titre}}': formData.title
        };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilisateur non authentifié');

        filePath = await TemplateService.generateDocumentFromTemplate(
          selectedType,
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
        await SignatureWorkflowService.initializeWorkflow(document.id, selectedType, userRole);
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="studentId">Numéro étudiant</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="UL2024001"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="faculte">Faculté *</Label>
                <Input
                  id="faculte"
                  value={formData.faculte}
                  onChange={(e) => setFormData({ ...formData, faculte: e.target.value })}
                  placeholder="Faculté des Sciences"
                  required
                />
              </div>
              <div>
                <Label htmlFor="promotion">Promotion *</Label>
                <Input
                  id="promotion"
                  value={formData.promotion}
                  onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
                  placeholder="L1, L2, L3..."
                  required
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Matière enseignée</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Informatique Appliquée"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours">Nombre d'heures *</Label>
                <Input
                  id="hours"
                  type="number"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="60"
                  required
                />
              </div>
              <div>
                <Label htmlFor="periode">Période *</Label>
                <Input
                  id="periode"
                  value={formData.periode}
                  onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                  placeholder="Janvier - Juin 2024"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montant">Montant *</Label>
                <Input
                  id="montant"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  placeholder="150000 FC"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nomCp">Nom du CP (optionnel)</Label>
                <Input
                  id="nomCp"
                  value={formData.nomCp}
                  onChange={(e) => setFormData({ ...formData, nomCp: e.target.value })}
                  placeholder="Laisser vide si pas de CP"
                />
              </div>
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
                {/* Vérification des permissions */}
                {selectedDocumentType && !canCreateSelectedType && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Accès restreint :</strong> Seuls les rôles {selectedDocumentType.allowedCreators.join(', ')} peuvent créer ce type de document.
                      Votre rôle actuel : {userRole}
                    </AlertDescription>
                  </Alert>
                )}

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
                        Visualisation finale limitée aux rôles : SAF, Appariteur, Réceptionniste, Bibliothécaire
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
                    disabled={!canCreateSelectedType}
                    disabled={!canCreateSelectedType}
                    <Download className="h-4 w-4" />
                    Enregistrer brouillon
                  </Button>
                  <Button type="button" onClick={handleAddSignature} variant="outline" className="gap-2">
                    <PenTool className="h-4 w-4" />
                    Ajouter signature
                  </Button>
                  <Button type="submit" variant="outline" className="gap-2" disabled={!canCreateSelectedType}>
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