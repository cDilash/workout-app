import { create } from 'zustand';
import { Paths, Directory, File } from 'expo-file-system';
import { db } from '../db/client';
import { userProfile } from '../db/schema';
import { eq } from 'drizzle-orm';

const PROFILE_ID = 'local_user';

interface ProfileState {
  username: string | null;
  profilePicturePath: string | null;
  bio: string | null;
  dateOfBirth: Date | null;
  height: number | null; // cm
  memberSince: Date | null;
  isLoaded: boolean;

  // Actions
  loadProfile: () => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  setProfilePicture: (uri: string) => Promise<string>;
  removeProfilePicture: () => Promise<void>;
  setBio: (bio: string) => Promise<void>;
  setDateOfBirth: (dob: Date | null) => Promise<void>;
  setHeight: (cm: number | null) => Promise<void>;

  // Helpers
  getInitials: () => string;
  getAge: () => number | null;
  getMemberDuration: () => string | null;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  username: null,
  profilePicturePath: null,
  bio: null,
  dateOfBirth: null,
  height: null,
  memberSince: null,
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
          bio: profile.bio,
          dateOfBirth: profile.dateOfBirth,
          height: profile.height,
          memberSince: profile.memberSince,
          isLoaded: true,
        });
      } else {
        // Create empty profile with current date as memberSince
        const now = new Date();
        await db.insert(userProfile).values({
          id: PROFILE_ID,
          username: null,
          profilePicturePath: null,
          bio: null,
          dateOfBirth: null,
          height: null,
          memberSince: now,
          createdAt: now,
          updatedAt: now,
        });
        set({ memberSince: now, isLoaded: true });
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

  setBio: async (bio: string) => {
    try {
      const trimmedBio = bio.trim();
      // Enforce 150 character limit
      const limitedBio = trimmedBio.slice(0, 150);

      await db
        .update(userProfile)
        .set({
          bio: limitedBio || null,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.id, PROFILE_ID));

      set({ bio: limitedBio || null });
    } catch (error) {
      console.error('Failed to update bio:', error);
      throw error;
    }
  },

  setDateOfBirth: async (dob: Date | null) => {
    try {
      await db
        .update(userProfile)
        .set({
          dateOfBirth: dob,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.id, PROFILE_ID));

      set({ dateOfBirth: dob });
    } catch (error) {
      console.error('Failed to update date of birth:', error);
      throw error;
    }
  },

  setHeight: async (cm: number | null) => {
    try {
      await db
        .update(userProfile)
        .set({
          height: cm,
          updatedAt: new Date(),
        })
        .where(eq(userProfile.id, PROFILE_ID));

      set({ height: cm });
    } catch (error) {
      console.error('Failed to update height:', error);
      throw error;
    }
  },

  getAge: () => {
    const { dateOfBirth } = get();
    if (!dateOfBirth) return null;

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust if birthday hasn't occurred this year yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  },

  getMemberDuration: () => {
    const { memberSince } = get();
    if (!memberSince) return null;

    const now = new Date();
    const startDate = new Date(memberSince);
    const diffMs = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return diffMonths === 1 ? '1 month' : `${diffMonths} months`;
    }

    const diffYears = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;

    if (remainingMonths === 0) {
      return diffYears === 1 ? '1 year' : `${diffYears} years`;
    }

    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
  },
}));
