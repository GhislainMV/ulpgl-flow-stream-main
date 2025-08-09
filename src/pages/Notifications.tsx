import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/LanguageProvider";
import { 
  Bell, 
  BellRing, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Users,
  Mail,
  Eye,
  Check
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const mockNotifications = [
  {
    id: 1,
    type: "signature_required",
    title: "Signature requise",
    message: "Le document 'Lettre d'honoraires - Dr. MUKENDI' attend votre signature",
    document: "Lettre d'honoraires - Dr. MUKENDI",
    priority: "high",
    read: false,
    timestamp: "2024-08-07T14:30:00Z",
    from: "SAF"
  },
  {
    id: 2,
    type: "document_signed",
    title: "Document signé",
    message: "Le Doyen a signé le document 'Relevé de notes - Jean KABILA'",
    document: "Relevé de notes - Jean KABILA",
    priority: "medium",
    read: false,
    timestamp: "2024-08-07T13:15:00Z",
    from: "Doyen"
  },
  {
    id: 3,
    type: "document_completed",
    title: "Document terminé",
    message: "Le document 'PV Conseil Facultaire - Juillet 2024' a été entièrement traité",
    document: "PV Conseil Facultaire - Juillet 2024",
    priority: "low",
    read: true,
    timestamp: "2024-08-07T11:00:00Z",
    from: "Système"
  },
  {
    id: 4,
    type: "reminder",
    title: "Rappel automatique",
    message: "Le document 'Demande de congé - Marie KASONGO' attend votre action depuis 2h",
    document: "Demande de congé - Marie KASONGO",
    priority: "medium",
    read: false,
    timestamp: "2024-08-07T10:30:00Z",
    from: "Système"
  },
  {
    id: 5,
    type: "new_document",
    title: "Nouveau document",
    message: "Un nouveau document 'Rapport mensuel - Août 2024' a été créé",
    document: "Rapport mensuel - Août 2024",
    priority: "low",
    read: true,
    timestamp: "2024-08-07T09:00:00Z",
    from: "SGAC"
  }
];

const settings = {
  emailNotifications: true,
  pushNotifications: true,
  signatureReminders: true,
  weeklyDigest: false,
  documentUpdates: true,
  systemMessages: true
};

export default function Notifications() {
  const { t } = useLanguage();
  const [notificationSettings, setNotificationSettings] = useState(settings);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "signature_required":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "document_signed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "document_completed":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "reminder":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "new_document":
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Urgent</Badge>;
      case "medium":
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Moyen</Badge>;
      case "low":
        return <Badge variant="outline" className="border-green-500 text-green-600">Faible</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return "Il y a quelques minutes";
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)}h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8" />
            {t("notifications")}
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Restez informé des dernières activités documentaires
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead} className="gap-2">
            <Check className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Toutes ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Non lues ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="urgent">
            Urgentes ({notifications.filter(n => n.priority === "high").length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            Paramètres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all hover:shadow-md cursor-pointer ${
                !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(notification.priority)}
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    
                    {notification.document && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileText className="h-3 w-3" />
                        <span className="text-primary font-medium">
                          {notification.document}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        De: {notification.from}
                      </span>
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        <Eye className="h-3 w-3" />
                        Voir le document
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {notifications
            .filter(n => !n.read)
            .map((notification) => (
              <Card 
                key={notification.id} 
                className="border-l-4 border-l-primary bg-primary/5 transition-all hover:shadow-md cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notification.priority)}
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      
                      {notification.document && (
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3" />
                          <span className="text-primary font-medium">
                            {notification.document}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          {notifications
            .filter(n => n.priority === "high")
            .map((notification) => (
              <Card 
                key={notification.id} 
                className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20 transition-all hover:shadow-md cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-red-600 dark:text-red-400">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(notification.priority)}
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      
                      <Button variant="destructive" size="sm" className="mt-2">
                        Action requise
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Paramètres de notification
              </CardTitle>
              <CardDescription>
                Configurez vos préférences de notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications">Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir les notifications par email Gmail
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="signature-reminders">Rappels de signature</Label>
                    <p className="text-sm text-muted-foreground">
                      Rappels automatiques après 1h sans signature
                    </p>
                  </div>
                  <Switch
                    id="signature-reminders"
                    checked={notificationSettings.signatureReminders}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, signatureReminders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="document-updates">Mises à jour de documents</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications lors des changements de statut
                    </p>
                  </div>
                  <Switch
                    id="document-updates"
                    checked={notificationSettings.documentUpdates}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, documentUpdates: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="weekly-digest">Résumé hebdomadaire</Label>
                    <p className="text-sm text-muted-foreground">
                      Rapport d'activité envoyé chaque lundi
                    </p>
                  </div>
                  <Switch
                    id="weekly-digest"
                    checked={notificationSettings.weeklyDigest}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, weeklyDigest: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="system-messages">Messages système</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications de maintenance et mises à jour
                    </p>
                  </div>
                  <Switch
                    id="system-messages"
                    checked={notificationSettings.systemMessages}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, systemMessages: checked }))
                    }
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="ulpgl" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Enregistrer les préférences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}