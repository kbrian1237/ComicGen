import { 
    signInWithPopup, 
    GoogleAuthProvider,
    signOut,
    User
} from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    Timestamp,
    orderBy,
    doc,
    deleteDoc
} from 'firebase/firestore';
import { Project, ProjectData } from '../types';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google: ", error);
        throw error;
    }
};

export const signOutUser = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out: ", error);
        throw error;
    }
};

export const saveProject = async (userId: string, projectData: ProjectData): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "projects"), {
      userId,
      ...projectData,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving project: ", error);
    throw error;
  }
};

export const getUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(collection(db, "projects"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() } as Project);
    });
    return projects;
  } catch (error) {
    console.error("Error getting user projects: ", error);
    throw error;
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "projects", projectId));
    } catch (error) {
        console.error("Error deleting project:", error);
        throw error;
    }
};