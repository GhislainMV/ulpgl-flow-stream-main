import { createContext, useContext, useState } from "react"

type Language = "fr" | "en"

type LanguageProviderProps = {
  children: React.ReactNode
  defaultLanguage?: Language
}

type LanguageProviderState = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const translations = {
  fr: {
    welcome: "Bienvenue",
    login: "Connexion",
    register: "Inscription", 
    email: "Email",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    firstName: "Prénom",
    lastName: "Nom",
    role: "Rôle",
    dashboard: "Tableau de bord",
    documents: "Documents",
    profile: "Profil",
    settings: "Paramètres",
    logout: "Déconnexion",
    createDocument: "Créer un document",
    documentTitle: "Titre du document",
    documentType: "Type de document",
    send: "Envoyer",
    save: "Enregistrer",
    cancel: "Annuler",
    pending: "En attente",
    signed: "Signé",
    completed: "Terminé",
    notifications: "Notifications",
    search: "Rechercher",
    filter: "Filtrer",
    dateCreated: "Date de création",
    status: "Statut",
    actions: "Actions",
    view: "Voir",
    download: "Télécharger",
    sign: "Signer",
    ulpglDescription: "Système de gestion des documents administratifs"
  },
  en: {
    welcome: "Welcome",
    login: "Login",
    register: "Register",
    email: "Email", 
    password: "Password",
    confirmPassword: "Confirm Password",
    firstName: "First Name",
    lastName: "Last Name",
    role: "Role",
    dashboard: "Dashboard",
    documents: "Documents",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    createDocument: "Create Document",
    documentTitle: "Document Title",
    documentType: "Document Type",
    send: "Send",
    save: "Save",
    cancel: "Cancel",
    pending: "Pending",
    signed: "Signed",
    completed: "Completed",
    notifications: "Notifications",
    search: "Search",
    filter: "Filter",
    dateCreated: "Date Created",
    status: "Status",
    actions: "Actions",
    view: "View",
    download: "Download",
    sign: "Sign",
    ulpglDescription: "Administrative Document Management System"
  }
}

const LanguageProviderContext = createContext<LanguageProviderState | undefined>(undefined)

export function LanguageProvider({
  children,
  defaultLanguage = "fr",
}: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(defaultLanguage)

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.fr] || key
  }

  const value = {
    language,
    setLanguage,
    t,
  }

  return (
    <LanguageProviderContext.Provider value={value}>
      {children}
    </LanguageProviderContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageProviderContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}