import { create } from 'zustand';
import { Paths, Directory, File } from 'expo-file-system';
import { db } from '../db/client';
import { userProfile } from '../db/schema';
import { eq } from 'drizzle-orm';

const PROFILE_ID = 'local_user';

interface ProfileState {
  username: string | null;
  profilePicturePath: string | null;
  isLoaded: boolean;

  // Actions
  loadProfile: () => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  setProfilePicture: (uri: string) => Promise<string>;
  removeProfilePicture: () => Promise<void>;

  // Helpers
  getInitials: () => string;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  username: null,
  profilePicturePath: null,
  isLoaded: false,

  loadProfile: async () => {
    try {
      const result = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.id, PROFILE_ID))
        .limit(1);

      if (result.length > 0) {
        const profile = result[0];
        set({
          username: profile.username,
          profilePicturePath: profile.profilePicturePath,
          isLoaded: true,
        });
      } else {
        // Create empty profile
        const now = new Date();
        await db.insert(userProfile).values({
          id: PROFILE_ID,
          username: null,
          profilePicturePath: null,
          createdAt: now,
          updatedAt: now,
        });
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      set({ isLoaded: true });
    }
  },

  setUsername: async (name: string) => {
    try {
      const trimmedName = name.trim();
      await db
        .update(userProfile)
        .set({
          username: trimmedName || null,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.id, PROFILE_ID));
      set({ username: trimmedName || null });
    } catch (error) {
      console.error('Failed to update username:', error);
      throw error;
    }
  },

  setProfilePicture: async (uri: string) => {
    try {
      // Ensure images directory exists
      const imagesDir = new Directory(Paths.document, 'images');
      if (!imagesDir.exists) {
        imagesDir.create();
      }

      // Delete old profile picture if exists
      const { profilePicturePath } = get();
      if (profilePicturePath) {
        try {
          const oldFile = new File(profilePicturePath);
          if (oldFile.exists) {
            oldFile.delete();
          }
        } catch {
          // Ignore deletion errors
        }
      }

      // Copy new image to app's document directory
      const fileName = `profile_${Date.now()}.jpg`;
      const sourceFile = new File(uri);
      const destFile = new File(imagesDir, fileName);
      sourceFile.copy(destFile);

      const destPath = destFile.uri;

      // Update database
      await db
        .update(userProfile)
        .set({
          profilePicturePath: destPath,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.id, PROFILE_ID));

      set({ profilePicturePath: destPath });
      return destPath;
    } catch (error) {
      console.error('Failed to set profile picture:', error);
      throw error;
    }
  },

  removeProfilePicture: async () => {
    try {
      const { profilePicturePath } = get();

      // Delete file if exists
      if (profilePicturePath) {
        try {
          const file = new File(profilePicturePath);
          if (file.exists) {
            file.delete();
          }
        } catch {
          // Ignore deletion errors
        }
      }

      // Update database
      await db
        .update(userProfile)
        .set({
          profilePicturePath: null,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.id, PROFILE_ID));

      set({ profilePicturePath: null });
    } catch (error) {
      console.error('Failed to remove profile picture:', error);
      throw error;
    }
  },

  getInitials: () => {
    const { username } = get();
    if (!username) return '';

    const words = username.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  },
}));
