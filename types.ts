// Fix: Add types for import.meta.env to resolve TypeScript errors in firebaseConfig.ts.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export enum AppState {
  SETUP,
  GENERATING,
  CHARACTER_REVIEW,
  SCENE_REVIEW,
  DISPLAY,
}

export interface Panel {
  description: string;
  imageUrl: string;
}

export interface ComicPage {
  panels: Panel[];
  layout: string;
}

export interface PanelDescription {
    description: string;
    characters: string[];
    sceneId: string;
    shotType?: string;
}

export interface Character {
    name: string;
    description: string;
}

export interface Scene {
    id: string;
    description: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

export interface ArtStyle {
  id: string;
  name: string;
  imageUrl: string;
  prompt: string;
}

// Data structure for saving to Firestore
export interface ProjectData {
  title: string;
  script: string;
  artStyle: ArtStyle;
  aspectRatio: '1:1' | '3:4' | '4:3';
  characters: Character[];
  scenes: Scene[];
  comicPages: ComicPage[];
  coverImageUrl: string | null;
}

// Data structure for projects retrieved from Firestore
export interface Project extends ProjectData {
  id: string;
  userId: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}