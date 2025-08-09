import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Users,
  Download,
  Eye
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const mockDocuments = [
  {
    id: 1,
    title: "Relevé de notes - Jean KABILA",
    type: "Relevé de notes",
    status: "pending",
    createdAt: "2024-08-07",
    progress: 60,
    currentStep: "En attente signature Doyen"
  },
  {
    id: 2,
    title: "Lettre d'honoraires - Dr. MUKENDI",
    type: "Lettre d'honoraires", 
    status: "signed",
    createdAt: "2024-08-06",
    progress: 100,
    currentStep: "Terminé"
  },
  {
    id: 3,
    title: "PV Conseil Facultaire - Août 2024",
    type: "PV Conseil",
    status: "pending",
    createdAt: "2024-08-05",
    progress: 25,
    currentStep: "En attente signature SAF"
  }
];

const stats = [
  {
    title: "Documents en cours",
    value: "12",
    icon: Clock,
    description: "+2 depuis hier",
    color: "text-blue-600"
  },
  {
    title: "Documents signés",
    value: "48",
    icon: CheckCircle2,
    description: "+8 cette semaine",
    color: "text-green-600"
  },
  {
    title: "En attente signature",
    value: "5",
    icon: AlertCircle,
    description: "Nécessite votre attention",
    color: "text-orange-600"
  },
  {
    title: "Total ce mois",
    value: "67",
    icon: TrendingUp,
    description: "+15% vs mois dernier",
    color: "text-purple-600"
  }
];

export default function Dashboard() {
  const { t } = useLanguage();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">En cours</Badge>;
      case "signed":
        return <Badge variant="outline" className="text-green-600 border-green-600">Signé</Badge>;
      case "completed":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Terminé</Badge>;
      default:
        return <Badge variant="outline">Inconnu</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("dashboard")}</h1>
          <p className="text-muted-foreground">
            Bienvenue dans votre espace de gestion documentaire ULPGL
          </p>
        </div>
        <Button variant="ulpgl" className="gap-2">
          <Plus className="h-4 w-4" />
          {t("createDocument")}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents récents
            </CardTitle>
            <CardDescription>
              Suivi de vos documents en cours de traitement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDocuments.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{doc.title}</h4>
                    {getStatusBadge(doc.status)}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{doc.type}</span>
                    <span>{doc.createdAt}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>{doc.currentStep}</span>
                      <span>{doc.progress}%</span>
                    </div>
                    <Progress value={doc.progress} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <Eye className="h-3 w-3" />
                      {t("view")}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <Download className="h-3 w-3" />
                      {t("download")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>
              Raccourcis vers les fonctions principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Relevé de notes
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Lettre d'honoraires
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              PV Conseil facultaire
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Users className="h-4 w-4" />
              Gérer les utilisateurs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Dernières actions effectuées sur les documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">Dr. MUKENDI a signé</span>
              <span className="font-medium">Lettre d'honoraires</span>
              <span className="text-muted-foreground">il y a 2h</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">Nouveau document créé:</span>
              <span className="font-medium">Relevé de notes - Jean KABILA</span>
              <span className="text-muted-foreground">il y a 4h</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              <span className="text-muted-foreground">En attente de signature:</span>
              <span className="font-medium">PV Conseil Facultaire</span>
              <span className="text-muted-foreground">il y a 1j</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}